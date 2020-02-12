# Creating a standalone executable

* By default resources are compiled on the fly (webpack and sass via the middleware). You can also build an executable and use it by running `node server/server-main-standalone.js`.
* You can create an executable (currently configured for Windows-x86 to take less space) by running `npm run editor-build-exe-win32`.
* The executable needs to copied along with the following, respecting the folder structure:
	* main.js
	* index.html
	* dist/*
	* src/*
	* lib/*
* You can then run vdp16-contained.exe from the resulting directory.



