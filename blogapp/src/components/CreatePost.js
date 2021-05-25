import { API, Auth, graphqlOperation } from "aws-amplify";
import React, { Component } from "react";
import { createPost } from "../graphql/mutations";

class CreatePost extends Component {
  state = {
    //must match schema fields in db
    postOwnerId: "",
    postOwnerUsername: "",
    postTitle: "",
    postBody: "",
  };

  componentDidMount = async () => {
    //TODO: TBA
    //RETRIEVE AUTH ON DIDMOUNT

    await Auth.currentUserInfo().then((user) => {
      this.setState({
        postOwnerId: user.attributes.sub,
        postOwnerUsername: user.username,
      });
      // console.log("Curr User: ", user.username);
      //console.log("Attr.Sub: User ", user.username.attributes.id);
    });
  };

  //handles state update
  handleChangePost = (event) => {
    this.setState({ [event.target.name]: event.target.value });
  };

  //Handle certain events syntax
  handleAddPost = async (event) => {
    event.preventDefault();

    const input = {
      postOwnerId: this.state.postOwnerId,
      postOwnerUsername: this.state.postOwnerUsername,
      postTitle: this.state.postTitle,
      postBody: this.state.postBody,
      createdAt: new Date().toISOString,
    };

    //sends data via graphql
    await API.graphql(graphqlOperation(createPost, { input }));

    //reset
    this.setState({ postTitle: "", postBody: "" });
  };

  render() {
    return (
      <form className="add-post" onSubmit={this.handleAddPost}>
        <input
          style={{ font: "19px" }}
          type="text"
          placeholder="Title"
          name="postTitle"
          required
          value={this.state.postTitle}
          onChange={this.handleChangePost}
        ></input>
        <textarea
          type="text"
          name="postBody"
          rows="3"
          cols="40"
          required
          placeholder="New Blog Post"
          value={this.state.postBody}
          onChange={this.handleChangePost}
        ></textarea>
        <input
          type="submit"
          className="btn"
          style={{ fontSize: "19ptx" }}
        ></input>
      </form>
    );
  }
}

export default CreatePost;
