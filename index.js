const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    // 'http://localhost:5173'
    'https://car-maganic.web.app/'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.adorufe.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyToken = async(req, res, next) => {
  const token = req.cookies?.token;
  if(!token){
    return res.send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('car-doctor').collection('services');
    const bookingCollection = client.db('car-doctor').collection('bookings');

    app.post('/jwt', async(req, res) => {
      
        const user = req.body;
        console.log(user)
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
         sameSite: 'none'
        }).send({ success: true });
      
    });
    app.post('/logout', async(req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', {maxAge: 0}).send({success: true})
    })

    app.get('/services', async (req, res) => {
     
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    });

    app.get('/services/:id', async (req, res) => {
    
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await serviceCollection.findOne(query, {
          projection: { title: 1, price: 1, service_id: 1, img: 1 }
        });
        res.send(result);
 
    });

 
    
    app.get('/bookings', async (req, res) => {
      console.log('All Cookies:', req.cookies);
      console.log('Token:', req.cookies.token);
      const query = req.query.email ? { email: req.query.email } : {};
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    
 

    app.post('/bookings', async (req, res) => {
     
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking);
        res.send(result);
     
    });

    app.patch('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = { $set: { status: req.body.status } };
        const result = await bookingCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: 'Failed to update booking' });
      }
    });

    app.delete('/bookings/:id', async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await bookingCollection.deleteOne(query);
        res.send(result);
      } catch (err) {
        res.status(500).send({ error: 'Failed to delete booking' });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
