import React, { Component } from "react";
import { listPosts } from "../graphql/queries";
import { Auth, API, graphqlOperation } from "aws-amplify";
import DeletePost from "../components/DeletePost";
import EditPost from "../components/EditPost";
import CommentPost from "../components/CommentPost";
import {
  onCreateComment,
  onCreateLike,
  onCreatePost,
  onDeletePost,
  onUpdatePost,
} from "../graphql/subscriptions";
import CreateCommentPost from "./CreateCommentPost";
import { FaThumbsUp } from "react-icons/fa";
import { createLike } from "../graphql/mutations";

class DisplayPosts extends Component {
  state = {
    ownerId: "",
    ownerUsername: "",
    isHovering: false,
    postLikedBy: [],
    posts: [],
  };

  componentDidMount = async () => {
    this.getPosts();

    await Auth.currentUserInfo().then((user) => {
      this.setState({
        ownerId: user.attributes.sub,
        ownerUsername: user.username,
      });
      // console.log("Curr User: ", user.username);
      //console.log("Attr.Sub: User ", user.username.attributes.id);
    });

    //! Important, example on how to use GRAPHQL Subscriptions
    //listeners are expensive
    this.createPostListener = API.graphql(
      graphqlOperation(onCreatePost)
    ).subscribe({
      next: (postData) => {
        const newPost = postData.value.data.onCreatePost;
        const prevPosts = this.state.posts.filter(
          (post) => post.id !== newPost.id
        );
        const updatedPosts = [newPost, ...prevPosts]; //... is the unpack op

        this.setState({ posts: updatedPosts });
      },
    });

    this.deletePostListener = API.graphql(
      graphqlOperation(onDeletePost)
    ).subscribe({
      next: (postData) => {
        const deletedPost = postData.value.data.onDeletePost;
        const updatedPosts = this.state.posts.filter(
          (post) => post.id !== deletedPost.id
        );
        this.setState({ posts: updatedPosts });
      },
    });

    this.updatePostListener = API.graphql(
      graphqlOperation(onUpdatePost)
    ).subscribe({
      next: (postData) => {
        const { posts } = this.state;
        const updatePost = postData.value.data.onUpdatePost;
        const index = posts.findIndex((post) => post.id === updatePost.id); ///
        const updatedPosts = [
          ...posts.slice(0, index),
          updatePost,
          ...posts.slice(index + 1),
        ];

        this.setState({ posts: updatedPosts });
      },
    });

    this.createPostCommentListener = API.graphql(
      graphqlOperation(onCreateComment)
    ).subscribe({
      next: (commentData) => {
        const createdComment = commentData.value.data.onCreateComment;
        let posts = [...this.state.posts];

        for (let post of posts) {
          if (createdComment.post.id === post.id) {
            post.comments.items.push(createdComment); //follow graphql schema
          }
        }
        this.setState({ posts });
      },
    });

    this.createPostLikeListener = API.graphql(
      graphqlOperation(onCreateLike)
    ).subscribe({
      next: (postData) => {
        const createdLike = postData.value.data.onCreateLike;
        let posts = [...this.state.posts];
        for (let post of posts) {
          if (createdLike.post.id === post.id) {
            post.likes.items.push(createdLike);
          }
        }

        this.setState({ posts });
      },
    });
  };

  //important!, always unmount streams of data
  componentWillUnmount() {
    this.createPostListener.unsubscribe();
    this.deletePostListener.unsubscribe();
    this.updatePostListener.unsubscribe();
    this.createPostCommentListener.unsubscribe();
    this.createPostLikeListener.unsubscribe();
  }

  getPosts = async () => {
    //example on how to retrieve data from AWS AppSync
    const result = await API.graphql(graphqlOperation(listPosts));

    //state update, similar to flutter
    this.setState({ posts: result.data.listPosts.items });

    //console.log("All Posts: ", result.data.listPosts.items);
  };

  //prevents the user from liking posts more than once
  likedPost = (postId) => {
    //postId : the id of the already liked post
    for (let post of this.state.posts) {
      if (post.id === postId) {
        if (post.postOwnerId === this.state.ownerId) return true;
        for (let like of post.likes.items) {
          if (like.likeOwnerId === this.state.ownerId) {
            return true;
          }
        }
      }
    }
    return false;
  };

  handleLike = async (postId) => {
    if (this.likedPost(postId)) {
      return this.setState({ errorMessage: "Can't like your own post..." });
    } else {
      const input = {
        numberLikes: 1,
        likeOwnerId: this.state.ownerId,
        likeOwnerUsername: this.state.ownerUsername,
        likePostId: postId,
      };

      try {
        const result = await API.graphql(
          graphqlOperation(createLike, { input })
        );

        console.log("Liked: ", result.data);
      } catch (error) {
        console.error(error);
      }
    }
  };

  render() {
    const { posts } = this.state;

    let loggedInUser = this.state.ownerId;

    //Follow data model on dynamo db
    return posts.map((post) => {
      return (
        <div className="posts" style={rowStyle} key={post.id}>
          <h1> {post.postTitle} </h1>
          <span style={{ fontStyle: "italic", color: "#0ca5e297" }}>
            {"Wrote by: "} {post.postOwnerUsername}
            {" on "}
            <time style={{ fontStyle: "italic" }}>
              {" "}
              {new Date(post.createdAt).toDateString()}
            </time>
          </span>

          <p> {post.postBody}</p>

          <br />
          <span>
            {post.postOwnerId === loggedInUser && <DeletePost data={post} />}

            {post.postOwnerId === loggedInUser && <EditPost {...post} />}

            <span>
              <p className="alert">
                {" "}
                {post.postOwnerId === loggedInUser &&
                  this.state.errorMessage}{" "}
              </p>
              <p onClick={() => this.handleLike(post.id)}>
                <FaThumbsUp />
                {post.likes.items.length}
              </p>
            </span>
          </span>

          <span>
            <CreateCommentPost postId={post.id} />
            {post.comments.items.length > 0 && (
              <span style={{ fontSize: "19px", color: "gray" }}>Comments:</span>
            )}
            {post.comments.items.map((comment, index) => (
              <CommentPost key={index} commentData={comment} />
            ))}
          </span>
        </div>
      );
    });
  }
}

const rowStyle = {
  background: "#f4f4f4",
  padding: "10px",
  border: "1px #ccc dotted",
  margin: "14px",
};

export default DisplayPosts;
