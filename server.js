import express from 'express';
const app = express();  // app is an instance of express

app.set('view engine', 'ejs');  // use EJS for templating
app.use(express.static('public'));  // serve static files from /public

// route for homepage HTTP GET requests
app.get('/', (req, res) => {
    res.render('index');  // respond to homepage GET request with index.ejs response
});

// starts server on port 3000
app.listen(3000, () => {
    console.log('Server started on port 3000!');
});