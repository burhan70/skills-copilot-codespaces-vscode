// Create web server
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const {randomBytes} = require('crypto');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Comments
const commentsByPostId = {};

// Get comments
app.get('/posts/:id/comments', (req, res) => {
    const postId = req.params.id;
    res.status(200).send(commentsByPostId[postId] || []);
});

// Create comment
app.post('/posts/:id/comments', async (req, res) => {
    const commentId = randomBytes(4).toString('hex');
    const postId = req.params.id;
    const {content} = req.body;
    const comments = commentsByPostId[postId] || [];
    comments.push({id: commentId, content, status: 'pending'});
    commentsByPostId[postId] = comments;
    await axios.post('http://event-bus-srv:4005/events', {
        type: 'CommentCreated',
        data: {id: commentId, content, postId, status: 'pending'}
    });
    res.status(201).send(comments);
});

// Event bus
app.post('/events', async (req, res) => {
    const {type, data} = req.body;
    if (type === 'CommentModerated') {
        const {postId, id, status, content} = data;
        const comments = commentsByPostId[postId];
        const comment = comments.find(comment => comment.id === id);
        comment.status = status;
        await axios.post('http://event-bus-srv:4005/events', {
            type: 'CommentUpdated',
            data: {id, postId, status, content}
        });
    }
    res.send({});
});

// Listen
app.listen(4001, () => {
    console.log('Listening on 4001');
});