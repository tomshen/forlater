var path = require('path')
  , express = require('express')
  , mongo = require('mongodb')
  , passport = require('passport')
  , TwitterStrategy = require('passport-twitter').Strategy;

// Set up MongoDB
var mongoUri = process.env.MONGOLAB_URI
            || process.env.MONGOHQ_URL
            || 'mongodb://localhost/forlater';

var User = {};
User.findOrCreate = function (user, callback) {
  // TODO: find or create user
  callback(null, {
    displayName: user.displayName,
    bookmarks: [
      {
        title: 'Hacker News',
        description: 'Awesome news site',
        url: 'https://news.ycombinator.com/'
      },
    ]
  });
}
User.addBookmark = function (user, callback) {

}
User.updateBookmark = function (user, callback) {

}
User.deleteBookmark = function (user, callback) {

}

// Set up Express
var app = express();
app.configure(function() {
  app.use(express.logger());
  app.use(express.static(path.join(__dirname, 'views')));
  app.set('port', process.env.PORT || 5000);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: process.env.SECRET_KEY }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

// Set up Twitter login
passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "http://localhost:5000/auth/twitter/callback"
  },
  function(token, tokenSecret, profile, done) {
    User.findOrCreate(profile, function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

app.get('/', function(req, res) {
  res.render('index');
});

app.get('/bookmarks', function(req, res) {
  res.render('bookmarks', {
    displayName: req.user.displayName,
    bookmarks: req.user.bookmarks
  });
});

// Redirect the user to Twitter for authentication.  When complete, Twitter
// will redirect the user back to the application at
//   /auth/twitter/callback
app.get('/auth/twitter', passport.authenticate('twitter'));

// Twitter will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/twitter/callback',
  passport.authenticate('twitter', { successRedirect: '/bookmarks',
                                     failureRedirect: '/auth/twitter' }));

app.listen(app.get('port'), function() {
  console.log('Listening on ' + app.get('port'));
});