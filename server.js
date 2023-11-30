// <--example-->


const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Middleware to extract user details from JWT token
// const authenticateUser = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Unauthorized' });
//   }

//   const token = authHeader.substring(7); // Extract the token from the "Bearer " prefix

//   try {
//     const decodedToken = jwt.verify(token, 'secret_key');
//     req.user = { id: decodedToken.password }; // Set the user details in req.user
//     next();
//   } catch (error) {
//     return res.status(401).json({ error: 'Invalid token' });
//   }
// };

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7); // Extract the token from the "Bearer " prefix

  try {
    const decodedToken = jwt.verify(token, 'secret_key');
    req.user = { id: decodedToken.password }; // Set the user details in req.user
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};


// Create a new user
app.post('/users', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password,
      },
    });

    // res.json(newUser );
    res.json({ message: 'Success', user: newUser });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (!user) {
      // User not found
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.password !== password) {
      // Incorrect password
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = jwt.sign({ userId: user.id }, 'secret_key'); // Generate JWT token with user's ID as payload

    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



  

app.get('/auth', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7); // Extract the token from the "Bearer " prefix
  let decodedToken;

  try {
    decodedToken = jwt.verify(token, 'secret_key');
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const userId = decodedToken.password;
    const userDetails = await prisma.user.findUnique({ where: { id: userId } });

    if (!userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User details parsed successfully',  userDetails  });
    // res.json({ userDetails });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  
  }
  
});




app.use('/posts', authenticateUser);

// create a post

app.post('/posts', authenticateUser, async (req, res) => {
  const { address, contact } = req.body;
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newPost = await prisma.post.create({
      data: {
        address,
        contact,
        userId,
        user: { connect: { id: userId } },
      },
    });

    res.json({ message: 'Post created successfully', post: newPost, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






app.get('/posts', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  try {
    const userPosts = await prisma.post.findMany({
      where: {
        userId,
      },
    });

    res.json({ message: 'User posts retrieved successfully', posts: userPosts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/posts/:postId', async (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.user.id;

  if (isNaN(postId)) {
    return res.status(400).json({ error: 'Invalid postId' });
  }

  try {
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        userId,
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post retrieved successfully', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// // update
// app.put('/posts/:postId', authenticateUser, async (req, res) => {
//   const { address, contact } = req.body;
//   const postId = parseInt(req.params.postId);
//   const userId = req.user.id;

//   try {
//     const updatedPost = await prisma.post.update({
//       where: {
//         id: postId,
//       },
//       data: {
//         address,
//         contact,
//         user: {
//           connect: {
//             id: userId,
//           },
//         },
//       },
//     });

//     res.json({ message: 'Post updated successfully', post: updatedPost });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

 // Update a post
 app.put('/posts/:postId', async (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.user.id;
  const { address, contact } = req.body;

  try {
    const updatedPost = await prisma.post.update({
      where: {
        id: postId
     
      },
      data: {
        address,
        contact,
           userId,
      },
    });

    res.json({ message: 'Post updated successfully', post: updatedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/posts/:postId', authenticateUser, async (req, res) => {
  const postId = parseInt(req.params.postId);
 

  try {
    const deletedPost = await prisma.post.delete({
      where: {
        id: postId,
        
      },
    });

    res.json({ message: 'Post deleted successfully', post: deletedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






// Start the server
app.listen(9000, () => {
  console.log('Server is running on port 9000');
});













