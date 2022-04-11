# Setting up

1. Open a terminal
2. Clone the repository

`git clone https://github.com/Brunni132/lewagon-workshop-game`

3. Move into the directory:

`cd lewagon-workshop-game`

4. Install the NPM (node) modules

`npm install`

5. Run the visual game editor

`npm run editor-open`

6. Open the folder with Visual Studio Code and start editing `src/game-main.js`.

# Troubleshooting

Windows:
* You need to have [Git for Windows](https://gitforwindows.org/) to clone the git repository. If you don't, it will say something like this:
`'git' is not recognized as an internal or external command,
operable program or batch file.`
* Opening a terminal can be done by opening the start menu and typing "bash" and opening the application `Git Bash`.
* If `npm` doesn't exist (the command `npm install` says that `'npm' is not recognized`), you need to install Node.js. One easy way to go is via Scoop (see the section below).

Mac:
* On Mac, open a terminal by pressing Command+Space, type Terminal, Enter.
* Make sure that you have Homebrew, which you can download [here](https://brew.sh/).
	* **Warning:** the installation can be time consuming and require a good internet connection, so make sure that you do it early.
* If you don't have Node.js (npm install fails), type the following in the terminal:
```
brew install nvm
nvm install 8
```

## Installing scoop and Node.js (Windows)
* Open powershell (start menu, type Powershell), then
```
Set-ExecutionPolicy RemoteSigned -scope CurrentUser
iwr -useb get.scoop.sh | iex
```
* This installs Scoop, which is a package manager for Windows, allowing you to install and remove easily open source software. It's an equivalent to homebrew on Mac. Then type:
```
scoop install nvm
nvm install 8
nvm use 8.16.2
```

# For more info
This is part of a project called vdp16. To see what it can do: https://brunni132.github.io/vdp16-samples/

Contact me for more info, f [underscore] bron [at] hotmail [dot] com.
