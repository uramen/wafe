# Web Ball Bounce Game

A classic brick-breaking game built with HTML5 Canvas and JavaScript.

## Features

- Smooth ball and paddle physics
- Colorful bricks with particle effects on collision
- Keyboard and mouse controls
- Lives and score tracking
- Win and lose conditions
- Mobile-friendly design

## How to Play

1. Open `index.html` in your web browser
2. Click the "Start Game" button
3. Control the paddle with your mouse or arrow keys
4. Break all the bricks to win
5. You have 3 lives to complete the game

## Controls

- **Mouse**: Move your mouse left and right to control the paddle
- **Keyboard**: Use the left and right arrow keys to move the paddle

## Local Development

To run the game locally:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm start` to start the local server
4. Open your browser and navigate to `http://localhost:3000`

## Deployment

### Netlify (Recommended)

The easiest way to deploy this game is using Netlify:

1. Create an account on [Netlify](https://www.netlify.com/)
2. Click on "New site from Git"
3. Connect your GitHub/GitLab/Bitbucket account
4. Select your repository
5. Leave the build command empty
6. Set the publish directory to `.`
7. Click "Deploy site"

Your game will be live in a few seconds with a Netlify subdomain (e.g., `your-game.netlify.app`). You can also set up a custom domain in the Netlify settings.

### GitHub Pages

Alternatively, you can use GitHub Pages:

1. Create a repository on GitHub
2. Push the code to the repository
3. Go to Settings > Pages
4. Select the main branch as the source
5. Click Save
6. Your game will be available at `https://your-username.github.io/your-repo-name/`

## Development

This game is built with vanilla JavaScript, HTML5, and CSS. No external libraries are required.

To modify or enhance the game:

1. Edit `game.js` to change game mechanics
2. Modify `style.css` to adjust the appearance
3. Update `index.html` to change the structure

## License

MIT License 