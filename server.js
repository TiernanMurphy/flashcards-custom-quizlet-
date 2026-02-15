// node lets you run JS outside a browser, Express is a web framework built on top of Node
// Express makes building web apps and APIs much easier (mainly HTTP, routing, and middleware stuff)

import dotenv from 'dotenv';

dotenv.config(); // load environment variables

import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';
import FlashcardSet from './models/FlashcardSet.js';
import Folder from './models/Folder.js';

const app = express();  // app is an instance of express

// mongoose connection, uses connection string as parameter, returns message based on results
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB!"))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

app.set('view engine', 'ejs');  // use EJS for templating
app.use(express.static('public'));  // serve static files from /public
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));  // parse form data

// session middleware (must come before passport)
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);

// passport middleware
app.use(passport.initialize());
app.use(passport.session());
app.use('/auth', authRoutes);

// route for homepage HTTP GET requests
app.get('/', (req, res) => {
    res.render('index');  // respond to homepage GET request with index.ejs response
});

// route to dashboard after login
app.get('/dashboard', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        // get all flashcard sets for current user
        const flashcardSets = await FlashcardSet.find({ user: req.user._id })
            .populate('folder')  // if flashcard set in folder, get folder details
            .sort({ createdAt: -1 });

        // get all folders for current user
        const folders = await Folder.find({ user: req.user._id })
            .sort({ name: 1 });  // alphabetical order

        res.render('dashboard', {
            user: req.user,
            flashcardSets,
            folders
        });
    } catch (err) {
        console.log(err);
        res.redirect('/');
    }
});

app.get('/sets/new', async (req, res) => {
   if (!req.isAuthenticated()) {
       return res.redirect('/');
   }

   const folders = await Folder.find( { user: req.user._id }).sort({ name: 1 });
   res.render('new-set', { user: req.user, folders });
});

app.post('/sets/create', async (req, res) => {
   if (!req.isAuthenticated()) {
       return res.redirect('/');
   }

   try {
       const { title, folder } = req.body;

       await FlashcardSet.create({
          title,
          user: req.user._id,
          folder: folder || null  // set to null if no folder selected
       });

       res.redirect('/dashboard');
   } catch (err) {
       console.error("error creating flashcard set:", err);
       res.redirect('/sets/new');
   }
});

// starts server on port 3000
app.listen(3000, () => {
    console.log('Server started on port 3000!');
});