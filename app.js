var express      = require('express');
var path         = require('path');
var favicon      = require('static-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var sass         = require('node-sass');
var multer       = require('multer')
var debug        = require('debug')('my-application');
var excel        = require('excel');
var spawn        = require('child_process').spawn;
var http         = require('http');
var app          = express();

var server = http.createServer(app).listen(8080, function() {
	console.log('Listening on port :' + server.address().port);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser('maphubrocks'));
app.use(session({ secret: 'maphubrocks' }));
app.use(multer({ 
	dest: './uploads/'
}));
app.use(
	sass.middleware({
		src: __dirname + '/public',
		dest: __dirname + '/public',
		debug: true,
		outputStyle: 'compressed'
	})
);
app.use(express.static(path.join(__dirname, 'public')));

// Phantom spawn count
var spawnCount = 0;
var SPAWN_MAX = 50;

// ============= ROUTES
app.get('/', function(req, res) {
	res.render('index', { title: 'McMaster'});
});

app.post('/upload-excel', function(req,res) {
	if(req.files && req.files.excel) {
		processFileUpload(req.files.excel.name, function(params) {
			if(params) {
				res.render('partsheet', params);
			} else {
				console.log("file error");
				res.redirect('/');
			}
		});
	} else {
		console.log("file error");
		res.redirect('/');
	}
});

app.post('/get-price', function(req,res) {
	getMcmasterURL(req.body.partNumber, function(catalogURL) {
		if(catalogURL) {
			var part = {
				partNumber: req.body.partNumber,
				catalogURL: catalogURL,
				count: 0
			};
			parseMcmasterCatalog(part, function(part) {
				res.json(part);
			});
		} else {
			res.json({error: true});
		}
	});
});

var processFileUpload = function(filename, callback) {
	if(filename.split('.').pop() == "xlsx") {
		excel('./uploads/'+filename, function(err, data) {
			if(err) {
				callback(null);
			} else {
				var partNumberIndex = -1;
				var priceIndex = -1;
				var pkgQtyIndex = 1;
				var quantityIndex = -1;
				var totalIndex = -1;
				for(var i=0; i<data[0].length; i++) {
					if(data[0][i].toLowerCase().search("part #") > -1 || data[0][i].toLowerCase().search("part number") > -1) {
						partNumberIndex = i;
					}
					if(data[0][i].toLowerCase().search("price") > -1 && data[0][i].toLowerCase().search("total") == -1) {
						priceIndex = i;
					}
					if(data[0][i].toLowerCase().search("unit quantity") > -1 || data[0][i].toLowerCase().search("package quantity") > -1) {
						pkgQtyIndex = i;
					}
					if(data[0][i].toLowerCase().search("quantity") > -1 && data[0][i].toLowerCase().search("package") == -1 && data[0][i].toLowerCase().search("unit") == -1) {
						quantityIndex = i;
					}
					if(data[0][i].toLowerCase().search("total") > -1 && data[0][i].toLowerCase().search("price") == -1) {
						totalIndex = i;
					}
				}
				params = {
					filename: filename,
					partNumberIndex: partNumberIndex,
					priceIndex: priceIndex,
					pkgQtyIndex: pkgQtyIndex,
					quantityIndex: quantityIndex,
					totalIndex: totalIndex,
					data: data
				};
				callback(params);
			}
		});
	} else {
		callback(null);
	}
};

var getMcmasterURL = function(partNumber, callback) {
	var searchURL = 'http://www.mcmaster.com/WebParts/SrchRsltWebPart/WebSrchEng.aspx?inpArgTxt='+partNumber+'&envrmgrcharsetind=2';
	http.get(searchURL, function(res) {
		var body = '';
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			var mcm_catalog_info = JSON.parse(body);
			if(mcm_catalog_info[0] && mcm_catalog_info[0]["WebSrchEngMetaDat"]) {
				var returnedPartNum = mcm_catalog_info[0]["WebSrchEngMetaDat"]["PartNbr"];
				var editionNumber = mcm_catalog_info[0]["WebSrchEngMetaDat"]["MostRecentCtlgEdtnNbr"];
				var pageNumber = mcm_catalog_info[0]["WebSrchEngMetaDat"]["MostRecentCtlgPgNbr"];
				var catalogURL = "http://www.mcmaster.com/#catalog/"+editionNumber+"/"+pageNumber;
				callback(catalogURL);
			} else {
				callback(null);
			}
		});
	}).on('error', function(e) {
		console.log("Got error: ", e);
		callback(null);
	});
};

var parseMcmasterCatalog = function(part, callback) {
	if(spawnCount >= SPAWN_MAX) {
		// Don't spin up to many PhantomJS Processes -- wait until one finishes
		setTimeout(function() { parseMcmasterCatalog(part, callback) }, 5000);
	} else {
		var phantom = spawn('phantomjs', ['worker.js', JSON.stringify(part)]);
		spawnCount++;
		phantom.stdout.on('data', function (data) {
			spawnCount--;
			console.log('stdout: ' + data);
			try {
				data = JSON.parse(data);
				if(data.priceEach) {
					callback(data);
				} else {
					if(part.count<=5) {
						part.count++;
						parseMcmasterCatalog(part, callback);
					} else {
						callback({error: true, partNumber: data.partNumber });
					}
				}
			} catch(e) {
				console.log(e);
				callback({error: true, partNumber: null });
			}
		});

		phantom.stderr.on('data', function (data) {
			// Not necessarily an actionable error - check this?
		});
	}
};

// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// ============= ERRORS
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
	message: err.message,
		error: {}
	});
});

module.exports = app;
