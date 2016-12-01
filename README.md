To run the app:
npm start from the /dribbble_client directory.

The start command accepts command line arguments with the following format:
npm start + "script type" + "item id", where "script type" is one of 
["usershots",
 "shot",
 "attachments",
 "everyone",
 "popular",
 "debuts"]

and "item id" is a userId or a shotId.

Examples:
npm start usershots 43762, where 43762 is the userId
npm start shot 12420, where 12420 is the shotId
npm start attachments 12420, where 12420 is the shotId
npm start everyone
npm start popular
npm start debuts

When any varation of the start commands is run, the client will download all images related to the command line parameters, and then store the images on the file system in the following directory: /dribbble_client/dribbble_saved_photos. This directory, its sub-directories, and the image files have the following naming scheme:
username/usershots-userid/43762-shotid/771815
username/usershots-[userId]/ , where 
/everyone-([date])
/debuts-([date])
/popular-([date])

When a single iteration of the script has completed, the following line will be printed to the console, and then the process will exit: "Fetch completed. Exiting process."



**Useful Dribbble client resources:**
- http://developer.dribbble.com/v1
- http://developer.dribbble.com/v1/#authentication
- https://www.npmjs.com/package/dribbble-api
- https://gist.github.com/jim/668086
- http://lab.tylergaw.com/jribbble/
- https://github.com/tylergaw/jribbble