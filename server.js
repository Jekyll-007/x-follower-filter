require('dotenv').config();
const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const path = require('path');

const app = express();
const port = 3002;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// X API Client with your credentials from .env
const client = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_KEY_SECRET,
    accessToken: process.env.ACCESS_TOKEN,
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
});

let oauthToken, oauthTokenSecret;

// Route 1: Start OAuth login with debug logging
app.get('/auth', async (req, res) => {
    try {
        console.log('Using credentials:', {
            appKey: process.env.API_KEY,
            appSecret: process.env.API_KEY_SECRET,
            accessToken: process.env.ACCESS_TOKEN,
            accessSecret: process.env.ACCESS_TOKEN_SECRET
        });
        const authLink = await client.generateAuthLink('http://localhost:3002/callback');
        console.log('Auth Link Generated:', authLink);
        oauthToken = authLink.oauth_token;
        oauthTokenSecret = authLink.oauth_token_secret;
        res.redirect(authLink.url);
    } catch (error) {
        console.error('Auth error details:', error);
        res.status(500).send('Authentication failed');
    }
});

// Route 2: Handle OAuth callback
app.get('/callback', async (req, res) => {
    const { oauth_token, oauth_verifier } = req.query;

    if (oauth_token !== oauthToken) {
        return res.status(400).send('Token mismatch');
    }

    try {
        const userClient = new TwitterApi({
            appKey: process.env.API_KEY,
            appSecret: process.env.API_KEY_SECRET,
            accessToken: oauthToken,
            accessSecret: oauthTokenSecret,
        });

        const { client: loggedClient } = await userClient.login(oauth_verifier);
        const user = await loggedClient.v2.me();

        // Fetch following
        const following = await loggedClient.v2.userFollowing(user.data.id, { asPaginator: true });
        const followingList = [];
        for await (const follow of following) {
            followingList.push(follow.username);
        }

        // Fetch followers
        const followers = await loggedClient.v2.userFollowers(user.data.id, { asPaginator: true });
        const followersList = [];
        for await (const follower of followers) {
            followersList.push(follower.username);
        }

        // Filter data
        const nonMutualFollowing = followingList.filter(user => !followersList.includes(user));
        const mutualFollows = followingList.filter(user => followersList.includes(user));
        const nonMutualFollowers = followersList.filter(user => !followingList.includes(user));

        // Send results to frontend
        res.sendFile(path.join(__dirname, 'public', 'results.html'), {
            headers: {
                'X-Data': JSON.stringify({
                    nonMutualFollowing,
                    mutualFollows,
                    nonMutualFollowers
                })
            }
        });
    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).send('Error processing data');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});