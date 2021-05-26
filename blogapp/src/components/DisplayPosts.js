import React, { Component } from "react";
import { listPosts } from "../graphql/queries";
import { API, graphqlOperation } from "aws-amplify";
import DeletePost from "../components/DeletePost";
import EditPost from "../components/EditPost";
import { onCreatePost, onDeletePost } from "../graphql/subscriptions";

class DisplayPosts extends Component {
  state = {
    posts: [],
  };

  componentDidMount = async () => {
    this.getPosts();

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
  };

  //important!, alwas unmount streams of data
  componentWillUnmount() {
    this.createPostListener.unsubscribe();
    this.deletePostListener.unsubscribe();
  }

  getPosts = async () => {
    //example on how to retrieve data from AWS AppSync
    const result = await API.graphql(graphqlOperation(listPosts));

    //state update, similar to flutter
    this.setState({ posts: result.data.listPosts.items });

    //console.log("All Posts: ", result.data.listPosts.items);
  };

  render() {
    const { posts } = this.state;

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
            <DeletePost data={post} />
            <EditPost />
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
