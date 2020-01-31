var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');

var models = require('./../models');
const multer = require('multer');

var createJWToken = require('./../util/tokenHelper');

const getStream = require('into-stream');
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  newPipeline
} = require('@azure/storage-blob');

const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const containerName2 = '<BLOB STORAGE FOLDER NAME>';
const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };
const saltRounds = 10;
const sharedKeyCredential = new StorageSharedKeyCredential(
  "<BLOBSTORAGENAME>",
  "<BLOBSTORAGEKEY>");
const pipeline = newPipeline(sharedKeyCredential);
const blobServiceClient = new BlobServiceClient(
  `https://<BLOBSTORAGENAME>.blob.core.windows.net`,
  pipeline
);

// A helper function used to read a Node.js readable stream into a string
//Trying to stream the content to base 64 string
const streamToString = async (readableStream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", (data) => {
      chunks.push(data);
    });
    readableStream.on("end", () => {
      let imageBuffer = Buffer.concat(chunks); 
      resolve(imageBuffer.toString('base64'));
    });
    readableStream.on("error", reject);
  });
}

/**
 * API to fetch the profile associated with the user
 */
router.get('/profile', async (req, res) => {
  let profileImage, user;
  const fetchUserProfileImage = async () => {
    try{
      const containerClient = blobServiceClient.getContainerClient(containerName2);
      const blockBlobClient = containerClient.getBlockBlobClient((req.user.id ? req.user.id : 'deafaultlogo') + '.jpg');
      const downloadBlockBlobResponse = await blockBlobClient.download(0);
      profileImage = await streamToString(downloadBlockBlobResponse.readableStreamBody);  
    }catch(err){
      profileImage = null;
    }
  }
  const fetchUserData = async () => {
    user = await models.user.findOne({
      where: {
          id: req.user.id,
      },
      attributes:['email', 'contactNumber', 
          'dob', 'address', 'securityAns1', 'securityAns2', 'securityAns3'
        ]
    })
  }

  try{
    await Promise.all([
      fetchUserData(),
      fetchUserProfileImage()
    ])
    res.send({
      success : true,
      data : {
        user,
        profileImage
      }
    })
  }catch(e){
    console.log("Error occured due to : ", e);
    res.status(500).send({
      success : false,
      message : "Internal Server Error occured"
    })
  }
})

/**
 * API to update data associated with user
 */
router.put('/profile', uploadStrategy, async(req, res) => {
  const {
    email,  
    contactNumber,
    dob,
    address,
    securityAns1,
    securityAns2, 
    securityAns3 
  } = req.body;
  models.user
  .update(
    { 
      contactNumber : contactNumber,
      dob : dob,
      address,
      securityAns1,
      securityAns2, 
      securityAns3
    },
    { where: { email: email, id: req.user.id }, returning: true }
  )
    .then(async (updatedUser) =>{
      try {
        if(!req.file) {
          return res.status(200).send({
            success : true,
            message : "User profile has been updated"
          });
        };
        //  Upload the file uploaded if any to the cloud storage account
        const blobName = req.user.id + '.jpg';
        const stream = getStream(req.file.buffer);
        const containerClient = blobServiceClient.getContainerClient(containerName2);;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadStream(stream,
          uploadOptions.bufferSize, uploadOptions.maxBuffers,
          { blobHTTPHeaders: { blobContentType: "image/jpeg" } });
        console.log("File has been uploaded successfully");
        res.status(200).send({
          success : true,
          message : "User profile has been updated"
        })
      } catch (err) {
        console.log("Error occured during file upload : ", err);
        res.status(200).send({
          success : true,
          message : "User profile has been updated"
        })
      }
     }).catch((err=>{
       console.log("Error occured due to : ", err);
       res.status(500).send({
          success: false,
          message : "Internal Server Error"
       });
     }))
})

/**
 * API to register the user on the platform
 */
router.post('/signup', uploadStrategy, (req, res) => {
  const { 
    email, contactNumber, password, dob, address, 
    securityAns1, securityAns2, securityAns3
  } = req.body;
  bcrypt.hash(password, saltRounds, function(err, hash) {
    if(err) return res.status(500).send({
      success: false,
      message: "Internal Server Error"
    });
    models.user
    .findOrCreate({where: {
      email: email
    }, defaults: {
      contactNumber,
      password: hash,
      dob,
      address,
      securityAns1,
      securityAns2, 
      securityAns3,
    }})
    .spread(async(user, created) => {
      
      try {
        if(!created) return;
        //  Upload the file uploaded if any to the cloud storage account
        const blobName = user.id+'.jpg';
        const stream = getStream(req.file.buffer);
        const containerClient = blobServiceClient.getContainerClient(containerName2);;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadStream(stream,
          uploadOptions.bufferSize, uploadOptions.maxBuffers,
          { blobHTTPHeaders: { blobContentType: "image/jpeg" } });
        console.log("File has been uploaded successfully");
        res
        .status(created? 200: 409)
        .send({
          success : created,
          message: created? "User registration complete. You can sign in to your account now !!!": "User already exists",
          user : {
            email : user.email
          }
        })
      } catch (err) {
        console.log("Error occured during file upload : ", err);
        res
        .status(created? 200: 409)
        .send({
          success : created,
          message: created? "User registration complete. You can sign in to your account now !!!": "User already exists",
          user : {
            email : user.email
          }
        })
      }
    })
  });
})

/**
 * API to be used for user signin
 */
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  const userToCheck = await models.user.findOne({
    where: {
      email: email,
    },
    attributes: 
    {
      include : ['password', 'id']
    }
  })
  if(!userToCheck) {
    res.status(401).send({
      success: false,
      message : "invalid Username/password"
    });
  } else {
    bcrypt.compare(password, userToCheck.password, (err, matched) => {
      if(matched) {
        res.status(200).send({
          success: true,
          data : {
            email : userToCheck.email,
            token: createJWToken({
              id: userToCheck.id,
              email : userToCheck.email,
            })
          },
          message : "Welcome " + userToCheck.email
        });
      } else {
        res.status(401).send({
          success: false,
          message : "invalid Username/password"
        });
      }
    })
  }

})

module.exports = router;
