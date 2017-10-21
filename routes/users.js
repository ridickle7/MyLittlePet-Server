var express = require('express');
var async = require('async');
var router = express.Router();

var FCM = require('fcm').FCM;
var apiKey = require('../auth/firebase_con')().apikey();
console.log(apiKey);
var fcm = new FCM(apiKey);

router.post('/pushExample', function (req, res, next) {
  var message = {
    registration_id: require('../auth/firebase_con')().registration_id(),   // required 
    collapse_key: 'Collapse key',
    data1: req.body.data1,
    data2: req.body.data2
  };

  fcm.send(message, function (err, messageId) {
    if (err) {
      console.log(err);
    }
    else {
      console.log('Sent with message ID: ', messageId);
    }
  });
  res.json({ data1: req.body.data1, data2: req.body.data2 });
});

var userTable = require('../auth/db/User/schema');
var ObjectId = require('mongodb').ObjectId;

router.get('/login/:tokenId', (req, res, next) => {
  let tokenId = req.params.tokenId;
  userTable.find({ uTokenId: tokenId }, (err, userArr) => {
    if (err)
      return res.status(500).send({ error: 'database failure' });
    else {
      console.log(userArr);
      isEmpty(userArr).length == 0 ?
        res.json()
        : res.json(userArr[0]);
    }
  });
});


router.get('/', (req, res, next) => {
  let orderBy = req.query.orderBy;

  userTable.find({}, (err, userList) => {
    if (err)
      return res.status(500).send({ error: 'database failure' });
    res.json(userList);
  })

});

router.get('/:uId', (req, res, next) => {
  let userId = req.params.uId;
  console.log(userId);
  userTable.find({ _id: ObjectId(userId) }, (err, userArr) => {
    if (err)
      return res.status(500).send({ error: 'database failure' });
    else {
      let userInfo = userArr[0];
      console.log(userInfo);

      // 나를 팔로잉하는 ( = 팔로워) 유저 찾기
      userTable.find({ uFollowingList: { '$in': userId } }, (err, followerUser) => {
        let jsonData = {
          uId: userInfo._id,
          uTokenId: userInfo.uTokenId,
          nickname: userInfo.uNickname,
          uImageURL: userInfo.uImageURL,
          uIntroduce: userInfo.uIntroduce,
          uGender: userInfo.uGender,
          uAge: userInfo.uAge,
          uSpecify: userInfo.uSpecify,
          uWeight: userInfo.uWeight,
          uAddress: userInfo.uAddress,
          uLatitude: userInfo.uLatitude,
          uLongitude: userInfo.uLongitude,
          uFollower: isEmpty(followerUser),
          uFollowing: isEmpty(userInfo.uFollowingList),
          uTagList: userInfo.uTagList
        }
        res.json(jsonData);
      });
    }
  });
});

router.post('/', (req, res, next) => {
  var user = new userTable({
    uTokenId: req.body.uTokenId,
    uNickname: req.body.uNickname,
    uImageURL: req.body.uImageURL,
    uIntroduce: req.body.uIntroduce,
    uGender: req.body.uGender,
    uAge: req.body.uAge,
    uSpecify: req.body.uSpecify,
    uWeight: req.body.uWeight,
    uAddress: req.body.uAddress,
    uLatitude: req.body.uLatitude,
    uLongitude: req.body.uLongitude,
    uFollowingList: [],
    uTagList: []
  });

  user.save((err, user) => {
    if (err)
      return console.error(err);
    else {
      // console.log('user 213 success : ', { user: user });
      res.json(user);
    }
  });
});

router.put('/', function (req, res, next) {
  let userId = req.body.id;
  userTable.findById({ _id: ObjectId(userId) }, (err, userInfo) => {
    if (err) {
      return res.status(500).send({ error: err });
    } else {
      // Update each attribute with any possible attribute that may have been submitted in the body of the request
      // If that attribute isn't in the request body, default back to whatever it was before.
      userInfo.uNickname = req.body.uNickname || userInfo.uNickname;
      userInfo.uImageURL = req.body.uImageURL || userInfo.uImageURL;
      userInfo.uIntroduce = req.body.uIntroduce || userInfo.uIntroduce;
      userInfo.uGender = req.body.uGender || userInfo.uGender;
      userInfo.uAge = req.body.uAge || userInfo.uAge;
      userInfo.uSpecify = req.body.uSpecify || userInfo.uSpecify;
      userInfo.uWeight = req.body.uWeight || userInfo.uWeight;
      userInfo.uAddress = req.body.uAddress || userInfo.uAddress;
      userInfo.uLatitude = req.body.uLatitude || userInfo.uLatitude;
      userInfo.uLongitude = req.body.uLongitude || userInfo.uLongitude;
      userInfo.uTagList = req.body.uTagList || userInfo.uTagList;

      // Save the updated document back to the database
      userInfo.save((err, userInfo) => {
        if (err) {
          res.status(500).send(err)
        }
        res.status(200).send(userInfo);
      });
    }
  });
});

router.get('/follower', (req, res, next) => {
  let userId = req.query.id;
  let output = [];
  let userFollowingList;

  userTable.find({ _id: userId }, function (err, targetUser) {
    if (err)
      return res.status(500).send({ 'err': err });
    else {
      userFollowingList = targetUser[0].followingList;
      userTable.find({ uFollowingList: { '$in': userId } }, (err, followerList) => {
        async.mapSeries(followerList, addFollowerUser, function (err, result) {
          // console.log('userList : ', {userList : output});
          res.json({ userList: output });
        });

        function addFollowerUser(userInfo, callback) {
          var followerUser = {
            userId: userInfo._id,
            nickname: userInfo.uNickname,
            imageURL: userInfo.uImageURL,
            isFollowing: userFollowingList.indexOf(userId) != -1 ? true : false
          };
          output.push(followerUser);
          callback(null, 'data');
        }
      });
    }
  });
})

router.post('/follower', (req, res, next) => {
  let userId = req.body.id;
  let targetUserId = req.body.targetId;

  userTable.update({ _id: userId }, { $addToSet: { uFollowingList: targetUserId } }, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send({ 'err': err });
    }
    else {
      res.json({ 'msg': 'OK' });
    }
  });
});


router.delete('/follower/:id/:targetId', (req, res, next) => {
  let userId = req.params.id;
  let targetUserId = req.params.targetId;
  console.log(req.params);

  userTable.update({ _id: userId }, { $pull: { uFollowingList: targetUserId } }, (err, result) => {
    if (err) {
      console.log(err);
      res.status(500).send({ 'err': err });
    }
    else {
      res.json({ 'msg': 'OK' });
    }
  });
});

router.get('/search', (req, res, next) => {
  let userId = req.query.id;
  let gender = req.query.gender;
  let age = req.query.age;
  let specify = req.query.specify;
  let weight = req.query.weight;
  let address = req.query.address;
  let latitude = Number(req.query.latitude);
  let longitude = Number(req.query.longitude);

  // 1순위 : 견종 (specify)
  // 2순위 : 성별 (gender)
  // 3순위 : 나이 (age)
  // 4순위 : 사는 곳 (address)

  userTable.aggregate([
    {
      $project:
      {
        _id: '$_id',
        tokenId: '$uTokenId',
        nickname: '$uNickname',
        imageURL: '$uImageURL',
        introduce: '$uIntroduce',
        gender: '$uGender',
        specify: '$uSpecify',
        weight: 'uWeight',
        latitude: '$uLatitude',
        longitude: '$uLongitude',
        address: '$uAddress',
        total: {
          $sqrt: {
            $add: [
              { $pow: [{ $subtract: ['$uLatitude', latitude] }, 2] },
              { $pow: [{ $subtract: ['$uLongitude', longitude] }, 2] }
            ]
          }
        }
      },
    },
    {
      '$sort':
      {
        'total': 1
      }
    }
  ], function (err, result) {
    if (err) {
      res.status(500).send({ 'err': err });
    }
    else
      res.json(result);
  })
});

router.get('/thunder', (req, res, next) => {
  let userId = req.query.id;
  let gender = req.query.gender;
  let age = req.query.age;
  let specify = req.query.specify;
  let weight = req.query.weight;
  let address = req.query.address;
  let latitude = Number(req.query.latitude);
  let longitude = Number(req.query.longitude);

  // 안드로이드에서 total 값 업데이트로 진행
  userTable.aggregate([
    {
      $project:
      {
        _id: '$_id',
        tokenId: '$uTokenId',
        nickname: '$uNickname',
        imageURL: '$uImageURL',
        introduce: '$uIntroduce',
        gender: '$uGender',
        specify: '$uSpecify',
        weight: 'uWeight',
        latitude: '$uLatitude',
        longitude: '$uLongitude',
        address: '$uAddress',
        total: 0
      },
    }
  ], function (err, result) {
    if (err) {
      res.status(500).send({ 'err': err });
    }
    else
      res.json(result);
  });
});

function isEmpty(nullList) {
  if (nullList == undefined) {
    return [];
  }

  else {
    return nullList;
  }
}

function realDistance(latitude, longitude, tLatitude, tLongitude) {
  // 참고 : http://iamted.kr/%EC%97%91%EC%85%80-%EB%91%90-%EC%A7%80%EC%A0%90%EC%9D%98-%EC%9C%84%EB%8F%84-%EA%B2%BD%EB%8F%84%EB%A1%9C-%EC%A7%81%EC%84%A0%EA%B1%B0%EB%A6%AC-%EA%B3%84%EC%82%B0%ED%95%98%EB%8A%94-%EC%97%91%EC%85%80/
  let distance
    = Math.acos(
      Math.cos(getRadians(90 - latitude))
      * Math.cos(getRadians(90 - tLatitude))

      + Math.sin(getRadians(90 - latitude))
      * Math.sin(getRadians(90 - tLatitude))
      * Math.cos(getRadians(longitude - tLongitude)))
    * 6378.137

  function getRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  return distance;
}

module.exports = router;
