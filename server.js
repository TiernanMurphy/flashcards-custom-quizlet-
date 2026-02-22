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
import Flashcard from './models/Flashcard.js';

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

        // count flashcards for each set
        for (let set of flashcardSets) {
            set.cardCount = await Flashcard.countDocuments({ flashcardSet: set._id });
        }

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

// create new set
app.get('/sets/new', async (req, res) => {
   if (!req.isAuthenticated()) {
       return res.redirect('/');
   }

   const folders = await Folder.find( { user: req.user._id }).sort({ name: 1 });
   res.render('new-set', { user: req.user, folders });
});

// create flashcard set
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

// fetch flashcard set
app.get('/sets/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const flashcardSet = await FlashcardSet.findById(req.params.id);

        // check set belongs to logged-in user
        if (!flashcardSet || flashcardSet.user.toString() !== req.user._id.toString()) {
            return res.redirect('/dashboard');
        }

        const flashcards = await Flashcard.find({ flashcardSet: req.params.id })
            .sort({ createdAt: 1 });

        const folders = await Folder.find({ user: req.user._id })
            .sort({ name: 1 });

        res.render('edit-set', {
            user: req.user,
            flashcardSet,
            flashcards,
            folders
        });
    } catch (err) {
        console.error('Error loading set:', err);
        res.redirect('/dashboard');
    }
});

// delete flashcard set
app.post('/sets/:id/delete', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const flashcardSet = await FlashcardSet.findById(req.params.id);

        // check set belongs to current user
        if (!flashcardSet || flashcardSet.user.toString() !== req.user._id.toString()) {
            return res.redirect('/dashboard');
        }

        // delete all flashcards in this set
        await Flashcard.deleteMany({ flashcardSet: req.params.id });

        // delete the set itself
        await FlashcardSet.findByIdAndDelete(req.params.id);

        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error deleting set:', err);
        res.redirect('/dashboard');
    }
});

// delete flashcard
app.post('/sets/:setId/cards/:cardId/delete', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        await Flashcard.findByIdAndDelete(req.params.cardId);
        res.redirect(`/sets/${req.params.setId}`);

    } catch (err) {
        console.error("Error deleting card:", err);
        res.redirect(`/sets/${req.params.setId}`);
    }
})

// add flashcard to set
app.post('/sets/:id/cards/add', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const { question, answer } = req.body;

        await Flashcard.create({
            question,
            answer,
            flashcardSet: req.params.id
        });

        res.redirect(`/sets/${req.params.id}`);
    } catch (err) {
        console.error('Error adding flashcard:', err);
        res.redirect(`/sets/${req.params.id}`);
    }
});

// show new folder form
app.get('/folders/new', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('new-folder', { user: req.user });
});

// create folder
app.post('/folders/create', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const { name } = req.body;

        await Folder.create({
            name,
            user: req.user._id
        });

        res.redirect('/dashboard');
    } catch (err) {
        console.error('Error creating folder:', err);
        res.redirect('/folders/new');
    }
});

// edit what folder a flashcard set's in
app.post('/sets/:id/update-folder', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const { folder } = req.body;

        await FlashcardSet.findByIdAndUpdate(req.params.id, {
            folder: folder || null
        });

        res.redirect(`/sets/${req.params.id}`);
    } catch (err) {
        console.error('Error updating folder:', err);
        res.redirect(`/sets/${req.params.id}`);
    }
});

// study flashcards one by one
app.get('/sets/:id/study', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/');
    }

    try {
        const flashcardSet = await FlashcardSet.findById(req.params.id);

        if (!flashcardSet || flashcardSet.user.toString() !== req.user._id.toString()) {
            return res.redirect('/dashboard');
        }

        const flashcards = await Flashcard.find({ flashcardSet: req.params.id })
            .sort({ createdAt: 1 });

        res.render('study-set', {
            user: req.user,
            flashcardSet,
            flashcards
        });
    } catch (err) {
        console.error('Error loading study page:', err);
        res.redirect('/dashboard');
    }
});

// starts server on port 3000
app.listen(3000, () => {
    console.log('Server started on port 3000!');
});
