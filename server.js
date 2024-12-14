const express = require('express');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fetch = require('node-fetch');
require('dotenv').config();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const root = path.join(__dirname, 'public');
const imagesDir = path.join(__dirname, 'data', 'images');
const blogimagesDir = path.join(__dirname, 'data', 'blog_images');
const usersFilePath = path.join(__dirname, 'data', 'users.json');
const secretKeyPath = path.join(__dirname, 'data', 'secret.key');
const redirectsFilePath = path.join(__dirname, 'data', 'redirects.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(root));
app.use('/images', express.static(imagesDir));
app.use('/blog_images', express.static(blogimagesDir));

const corsOptions = {
    origin: 'http://localhost:3000', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type'],
};

app.use(cors(corsOptions));
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    console.log(`Created directory: ${imagesDir}`);
}
if (!fs.existsSync(blogimagesDir)) {
    fs.mkdirSync(blogimagesDir, { recursive: true });
    console.log(`Created directory: ${blogimagesDir}`);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesDir);
        cb(null, blogimagesDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });
const API_KEY = process.env.API_KEY;
const verifyAPIKey = (req, res, next) => {
    const apiKey = req.header('Authorization');
    if (!apiKey || apiKey !== `Bearer ${API_KEY}`) {
        return res.status(403).send('Forbidden');
    }
    next();
};
app.get('/api/get-config', (req, res) => {
    const config = {
        apiKey: process.env.API_KEY, 
    };
    res.json(config);
});
app.get('/redirect', (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).send('Missing id parameter');
    }

    fs.readFile(redirectsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading redirects file:', err);
            return res.status(500).send('Internal server error');
        }

        try {
            const redirects = JSON.parse(data);
            const redirectEntry = redirects.find(entry => entry.id.toString() === id);

            if (redirectEntry) {

                return res.redirect(302, redirectEntry.linkHref);
            } else {
                return res.status(404).send('Redirect not found');
            }
        } catch (parseErr) {
            console.error('Error parsing redirects file:', parseErr);
            return res.status(500).send('Internal server error');
        }
    });
});
const dataFiles = [
    'posts.json',
    'posts-messages.json',
    'shop.json',
    'data_media.json',
    'data.json',
    'cart.json',
    'info.json',
];

dataFiles.forEach(file => {
    app.get(`/data/${file}`, (req, res) => {
        const filePath = path.join(__dirname, 'data', file);
        if (file === 'users.json' || file === 'secret.key') {
            return res.status(403).send('Access Denied');
        }
        res.sendFile(filePath);
    });
});

app.get('/api/get-secret-key',verifyAPIKey, async (req, res) => {
    try {
        const secretKey = await fs.promises.readFile(secretKeyPath, 'utf8');
        res.status(200).json({ key: secretKey });
    } catch (error) {
        console.error('Error reading secret.key:', error);
        res.status(500).json({ error: 'Failed to retrieve the secret key' });
    }
});

app.get('/api/get-users', async (req, res) => {
    try {
        const usersData = await fs.promises.readFile(usersFilePath, 'utf8');
        const parsedUsers = JSON.parse(usersData); 

        if (!parsedUsers.users || !Array.isArray(parsedUsers.users)) {
            return res.status(400).json({ error: 'Invalid users data format.' });
        }

        res.status(200).json({ users: parsedUsers.users }); 
    } catch (error) {
        console.error('Error reading users data:', error);
        res.status(500).json({ error: 'Failed to retrieve users data' });
    }
});
app.post('/api/add-user', async (req, res) => {
    const { username, email, encrypted } = req.body;

    console.log(req.body); 

    if (!username || !email || !encrypted) {
        console.error('Missing required fields');
        return res.status(400).json({ error: 'Username, email, and encrypted data are required' });
    }

    try {
        const usersData = await fs.promises.readFile(usersFilePath, 'utf8');
        const parsedUsers = JSON.parse(usersData);

        if (!parsedUsers.users || !Array.isArray(parsedUsers.users)) {
            console.error('Invalid users data format');
            return res.status(400).json({ error: 'Invalid users data format' });
        }

        let userId = 1;
        if (parsedUsers.users.length > 0) {
            userId = Math.max(...parsedUsers.users.map(user => user.user_id)) + 1;
        }

        const newUser = {
            user_id: userId,  
            encrypted,        
        };

        parsedUsers.users.push(newUser);

        await fs.promises.writeFile(usersFilePath, JSON.stringify(parsedUsers, null, 2), 'utf8');
        res.status(200).json({ success: true, message: 'User added successfully' });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({ success: false, error: 'Error adding user' });
    }
});

const htmlFiles = {
    '': 'index.html',
    '/signin': 'signin.html',
    '/home': 'index.html',
    '/blog': 'blog.html',
    '/post': 'post.html',
    '/shop': 'shop.html',
    '/publications': 'publications.html',
    '/media&videos': 'media&videos.html',
    '/cart': 'cart.html',
    '/preview': 'preview.html',
    '/signup': 'signup.html'
};

for (const route in htmlFiles) {
    app.get(route, (req, res) => {
        res.sendFile(path.join(root, htmlFiles[route]));
    });
}

app.post('/update-messages', async (req, res) => {
    const { message } = req.body;
    const filePath = path.join(__dirname, 'data', 'posts-messages.json');

    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        let messages = JSON.parse(data);

        if (!messages[message.postId]) {
            messages[message.postId] = [];
        }

        messages[message.postId].push(message);

        await fs.promises.writeFile(filePath, JSON.stringify(messages, null, 2), 'utf8');
        res.status(200).json({ success: true, message: 'Message updated successfully' });
    } catch (error) {
        console.error('Error updating messages:', error);
        res.status(500).json({ success: false, error: 'Error updating messages' });
    }
});

app.get('/api/ip', async (req, res) => {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching IP address:', error);
        res.status(500).send('Error fetching IP address');
    }
});

app.get('/api/preview', async (req, res) => {
    const previewId = req.query.id || 'defaultId';
    const filePath = path.join(__dirname, 'data', 'previews', `${previewId}.json`);

    try {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error(`Error reading file for previewId: ${previewId}`, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: `File not found: ${previewId}.json` });
        } else {
            res.status(500).json({ error: 'Internal Server Error: Could not read file' });
        }
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post('/send-email', async (req, res) => {
    const { to, subject, text } = req.body;
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).send('Email sent');
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).send('Error sending email');
    }
});

app.post('/add-to-cart', async (req, res) => {
    const { userId, productId, price } = req.body;
    const cartFilePath = path.join(__dirname, 'data', 'cart.json');

    try {
        const data = await fs.promises.readFile(cartFilePath, 'utf8');
        let cartData = data ? JSON.parse(data) : [];

        cartData.push({ userId, productId, price });

        await fs.promises.writeFile(cartFilePath, JSON.stringify(cartData, null, 2), 'utf8');
        res.status(200).json({ success: true, message: 'Item added to cart' });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/update-posts', upload.single('postImage'), async (req, res) => {
    const { title, content } = req.body;
    const imageUrl = req.file ? path.join('images', req.file.filename) : null;
    const filePath = path.join(__dirname, 'data', 'posts.json');

    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        let posts = JSON.parse(data);

        const newPost = { title, content, imageUrl };
        posts.push(newPost);

        await fs.promises.writeFile(filePath, JSON.stringify(posts, null, 2), 'utf8');
        res.status(200).send('Post updated successfully');
    } catch (error) {
        console.error('Error updating posts:', error);
        res.status(500).send('Error updating posts');
    }
});

app.post('/api/admin/update-info', async (req, res) => {
    const newInfo = req.body;
    const infoFilePath = path.join(__dirname, 'data', 'info.json');

    try {
        await fs.promises.writeFile(infoFilePath, JSON.stringify(newInfo, null, 2), 'utf8');
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error updating info:', error);
        res.status(500).json({ success: false, error: 'Failed to update info' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});