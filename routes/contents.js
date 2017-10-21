var express = require('express');
var router = express.Router();
var path = require('path');

var contentTable = require('../auth/db/Content/schema');
var ObjectId = require('mongodb').ObjectId;

// 태그 테스트
// router.post('/test', function (req, res, next) {
//     res.send(getTagFromText(req.body.text));
// });

// 해당 컨텐츠 상세 확인
router.get('/:cId', function (req, res, next) {
    let contentId = req.params.cId;

    contentTable.find({ _id: ObjectId(contentId) }, (err, contentList) => {
        if (err) {
            console.log(err);
            res.status(500).send({ err: err });
        }
        else {
            res.json(contentList[0]);
        }
    });
});

// 해당 유저의 컨텐츠 확인
router.get('/', function (req, res, next) {
    let userId = req.query.uId;
    let outputList = [];

    contentTable.find({ cOwner: userId }, (err, contentList) => {
        if (err)
            res.status(500).send({ err: err });
        else {
            console.log(contentList);
            res.json(contentList);
        }
    });
});

router.post('/', function (req, res, next) {
    let userId = req.body.uId;
    let text = req.body.cText;
    let imageURL = req.body.cImageURL;

    var content = new contentTable({
        cOwner: userId,
        cDate: new Date().getTime(),
        cEid: "",
        cType: 0,
        cText: text,
        cTagList: getTagFromText(text),
        cGood: [],
        cImageURL: imageURL
    })

    content.save((err, data) => {
        if (err) {
            res.status(500).send(err)
        }

        res.json(data);
    });
});

router.put('/', function (req, res, next) {
    let contentId = req.body.id;
    let text = req.body.text;

    contentTable.update({ _id: contentId }, { $set: { cText: text, cTagList: getTagFromText(text) } }, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send({ 'err': err });
        }
        else {
            res.json({ 'msg': 'OK' });
        }
    });
});

router.put('/good', function (req, res, next) {
    let userId = req.body.uId;
    let contentId = req.body.cId;

    contentTable.update({ _id: contentId }, { $addToSet: { cGood: userId } }, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send({ 'err': err });
        }
        else {
            res.json({ 'msg': 'OK' });
        }
    });
});

router.put('/unGood', function (req, res, next) {
    let userId = req.body.uId;
    let contentId = req.body.cId;

    contentTable.update({ _id: contentId }, { $pull: { cGood: userId } }, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send({ 'err': err });
        }
        else {
            res.json({ 'msg': 'OK' });
        }
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

function getTagFromText(text) {
    var tagList = [];

    let index = text.indexOf("#");
    let lineList = text.split('\n');

    // ex) ab#sdf dfd #f_e \n cd
    for (let i = 0; i < lineList.length; i++) {
        let tempText = lineList[i];

        while (getIndex(tempText, '#') > -1) {
            let tempIndex = getIndex(tempText, '#');
            let tagChunk = tempText.substring(tempIndex + 1);
            tagList.push(tagChunk.split(' ')[0]);

            tempText = tagChunk.substring(getIndex(tagChunk, ' ') + 1);
            console.log('tempText : ' + tempText);
        }
    }
    return tagList;
}

function getIndex(allText, value) {
    return allText.indexOf(value);
}

module.exports = router;