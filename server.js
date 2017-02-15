'use strict';

const
	express = require('express'),
	path = require('path'),
	app = express();

var home = function (req, res) {
	res.sendFile(path.join(__dirname, './www/index.html'));
};

app.get('/', home);
app.use(express.static('www'));
app.get('*', home);

const port = process.env.PORT || 5000;
app.listen(port, () => {
	console.log('listening on port', process.env.PORT || port);
});
