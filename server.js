// node lets you run JS outside a browser, Express is a web framework built on top of Node
// Express makes building web apps and APIs much easier (mainly HTTP, routing, and middleware stuff)

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // load environment variables

const app = express();  // app is an instance of express

// mongoose connection, uses connection string as parameter, returns message based on results
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB!"))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

app.set('view engine', 'ejs');  // use EJS for templating
app.use(express.static('public'));  // serve static files from /public

// route for homepage HTTP GET requests
app.get('/', (req, res) => {
    res.render('index');  // respond to homepage GET request with index.ejs response
});

// test route
app.get('/auth/google', (req, res) => {
   res.render('test');
});

// starts server on port 3000
app.listen(3000, () => {
    console.log('Server started on port 3000!');
});