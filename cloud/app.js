var fs = require('fs');
var http = require('http');
var https = require('https');
var dribbbleApi = require('dribbble-api');
var express   = require('express');
var request = require('request');
// var Promise = require('promise');

var base_dribbble_url = 'https://api.dribbble.com/v1/';
var dribbble_client_access_token = '8da27c7ff5a81648b7391fcf8387e34df74ef36bf65252531a4d1ada331b10c7';
var base_images_directory = "dribbble_saved_photos";
var saved_images_directory = "";
var todaysDate = new Date();

/*
Things to fix:
Fetch everyone, popular, and debuts sequentially, not in parallel and update saved_images_directory
*/

// Configure Express:
var app       = module.exports = express();
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
 
var dribbble = new dribbbleApi();

// Requests:
var requestCallback = function(err, res, json, paging, completion) {
	var shotResultsArray = [];

  if (Array.isArray(json)) {
  	// Save JSON to .json file
    saveJSONFileToDirectory(json, saved_images_directory);

    shotResultsArray = shotResultsArray.concat(json);

    // Track results length, so we know when to exit the process in fetchCompletion():
    streamRequestCount+=shotResultsArray.length;

    // Iterate over shotResultsArray, download each image, and save it to a directory:
    for (var i = 0; i < shotResultsArray.length; i++) {
    	// In the case where we're fetching shots for a specific user, dribbble does not return a "user" attribute:
    	var username = shotResultsArray[i].user ? shotResultsArray[i].user.username : process.argv[2];
    	var user_id = shotResultsArray[i].user ? shotResultsArray[i].user.id : process.argv[3];

    	var fileName = "username(" + username + ")-userid(" + user_id + ")-shotid(" + shotResultsArray[i].id + ")";
    	fileName = fileName.replace(/ /g,"_").replace("\\","_").replace("/","_").replace("\"","_");

    	// HD image is available:
    	if (shotResultsArray[i].images && shotResultsArray[i].images.hidpi) {
    		saveFileToDirectory(shotResultsArray[i].images.hidpi, fileName + getFileExtension(shotResultsArray[i].images.hidpi), saved_images_directory);
    	// Only "normal" size image is available:
    	} else if (shotResultsArray[i].images) {
    		saveFileToDirectory(shotResultsArray[i].images.normal, fileName + getFileExtension(shotResultsArray[i].images.normal), saved_images_directory);
    	// Image is an attachment:
    	} else {
    		saveFileToDirectory(shotResultsArray[i].url, fileName + getFileExtension(shotResultsArray[i].url), saved_images_directory);
    	}
    }
  } else {
  	// We've fetched a specific shot:
  	if (json.images) {
  		streamRequestCount++;

  		var fileName = "username(" + json.user.username + ")-userid(" + json.user.id + ")-shotid(" + json.id + ")";
    	fileName = fileName.replace(/ /g,"_").replace("\\","_").replace("/","_").replace("\"","_");

    	saved_images_directory = base_images_directory + "/username(" + json.user.username + ")-userid(" + json.user.id + ")";

    	// Save JSON to .json file
    	saveJSONFileToDirectory(json, saved_images_directory);

  		if (json.images.hidpi) {
  			saveFileToDirectory(json.images.hidpi, fileName + getFileExtension(json.images.hidpi), saved_images_directory);
  		} else {
  			saveFileToDirectory(json.images.normal, fileName + getFileExtension(json.images.normal), saved_images_directory);
  		}
  	// We've fetched a user profile:
  	} else {
  		//completion(json.username);
  		return;
  	}
  }

  if (paging.next) {
    paging.next(requestCallback);
  }
}

var getFileExtension = function(str) {
	// Get file extension:
	var dotIndex = str.lastIndexOf('.');
	var ext = str.substring(dotIndex);

	if (ext.length <= 4) {
		return ext;
	} else {
		return null;
	}
}

var baseRequest = function(requestBase, page, callback) {
	var url = base_dribbble_url + requestBase;

	// Pagination:
	if (typeof(page) === 'number') {
		var per_page = 100;

		url = url + "&page=" + page + "&per_page=" + per_page;
	}

	request(url, function(err, res, body) {
		var paging = {};
    var pages;

    if (!body) {
      return callback(new Error('No response from Dribbble API'));
    }

    try {
      body = JSON.parse(body);
    } catch(e) {}

    if (body.length >= per_page) {
      paging.next = function(callback) {
        page = page + 1;
        baseRequest(requestBase, page, callback);
      };
    }

	  if (page > 1) {
	    paging.previous = function(callback) {
	      page = page - 1;
	      baseRequest(requestBase, page, callback);
	    };
	  }

    callback(err, res, body, paging);
	});
}
 
var fetchCompletion = function() {
	console.log("Number of images still downloading: " + streamRequestCount);
	if (streamRequestCount <= 0) {
		console.log("Fetch completed. Exiting process.");
		process.exit();
	}
}

// Debuts:
var fetchDebuts = function() {
	saved_images_directory = base_images_directory + "/debuts-(" + todaysDate + ")"
	baseRequest("shots?list=debuts&access_token=" + dribbble_client_access_token, 0, requestCallback);
}

// Popular:
var fetchPopular = function() {
	saved_images_directory = base_images_directory + "/popular-(" + todaysDate + ")"
	baseRequest("shots?list=popular&access_token=" + dribbble_client_access_token, 0, requestCallback);
}

// Everyone:
var fetchEveryone = function() {
	saved_images_directory = base_images_directory + "/everyone-(" + todaysDate + ")"
	baseRequest("shots?list=everyone&access_token=" + dribbble_client_access_token, 0, requestCallback);
}

var fetchAll = function() {
	// fetchDebuts();
	// fetchPopular();
	fetchEveryone();
}

// Fetch a specific User's profile:
var fetchUser = function(userId) {
	baseRequest("users/" + userId + "?access_token=" + dribbble_client_access_token, null, requestCallback);
}

// Fetch shots by specific Users:
var fetchShotsByUser = function(userId, directory) {
	baseRequest("users/" + userId + "?access_token=" + dribbble_client_access_token, null, function(err, res, json) {
		saved_images_directory = base_images_directory + "/username(" + json.username + ")-userid(" + json.id + ")";
		baseRequest("users/" + userId + "/shots" + "?access_token=" + dribbble_client_access_token, 0, requestCallback);
	});
}

// Fetching a specific shot
var fetchShot = function(shotId) {
	baseRequest("shots/" + shotId + "?access_token=" + dribbble_client_access_token, null, requestCallback);
}

// Fetching a shot's attachments
var fetchAttachment = function(shotId) {
	baseRequest("shots/" + shotId + "?access_token=" + dribbble_client_access_token, null, function(err, res, json) {
		saved_images_directory = base_images_directory + "/username(" + json.user.username + ")-userid(" + json.user.id + ")";
		baseRequest("shots/" + shotId + "/attachments" + "?access_token=" + dribbble_client_access_token, null, requestCallback);
	});
}

// Methods can be run from the command line:
var scriptType = process.argv[2];
if (scriptType) {
	var unitType = process.argv[2];
	var unitId = process.argv[3];

	if (unitType && unitId) {
		if (unitType == "usershots") {
			console.log("Fetching shots for a specific user with id:" + unitId);
			fetchShotsByUser(unitId);
		} else if (unitType == "shot") {
			console.log("Fetching a specific shot with id:" + unitId);
			fetchShot(unitId);
		} else if (unitType == "attachments") {
			console.log("Fetching attachments for a specific shot with id:" + unitId);
			fetchAttachment(unitId);
		} else {
			console.log("Error: missing some command line arguments. Try again.");
		}
	} else if (unitType == "everyone") {
		console.log("Fetching today's results for 'Everyone'.");
		fetchEveryone();
	} else if (unitType == "popular") {
		console.log("Fetching today's results for 'Popular'.");
		fetchPopular();
	} else if (unitType == "debuts") {
		console.log("Fetching today's results for 'Debuts'.");
		fetchDebuts();
	}
} else {
	console.log("Error: missing some command line arguments. Try again.");
	process.exit();
	//fetchAll();
}


var streamRequestCount = 0;

var saveJSONFileToDirectory = function(paginationResults, directory) {

	if (!fs.existsSync(base_images_directory)){
	  	fs.mkdirSync(base_images_directory);
	}

	if (!fs.existsSync(directory)){
	  fs.mkdirSync(directory);
	}

	if (!fs.existsSync(directory + "/" + "images.json")) {
		paginationResults = JSON.stringify(paginationResults); //convert it back to json
		fs.writeFile(directory + "/" + "images.json", paginationResults, "utf8", function(err, data) {
			if (err){
		    	console.log("Error writing to JSON file:");
		        console.log(err);
		    }
		});
	} else {
		fs.readFile(directory + "/" + "images.json", "utf8", function readFileCallback(err, data){
		    if (err){
		    	console.log("Error writing to JSON file:");
		        console.log(err);
		    } else {
		    obj = JSON.parse(data); //now it an object
		    if (paginationResults.length) {
		    	console.log(paginationResults);
				obj = obj.concat(paginationResults); //add some data
				json = JSON.stringify(obj); //convert it back to json
				fs.writeFile(directory + "/" + "images.json", json, "utf8", function() {
					//
				}); // write it back 
		    }
		}});
	}
}

var saveFileToDirectory = function(fileUrl, fileName, directory) {
	if (!fs.existsSync(base_images_directory)){
	  	fs.mkdirSync(base_images_directory);
	}

	if (!fs.existsSync(directory)){
	  	fs.mkdirSync(directory);
	}

	var file = fs.createWriteStream(directory + "/" + fileName);
	var request = https.get(fileUrl, function(response) {
	  response.pipe(file);
	  response.on('end', function () { 
			streamRequestCount--;
			fetchCompletion();
		});
	});

	request.on('error', function (e) {
  		console.log(e);
  	});
}

