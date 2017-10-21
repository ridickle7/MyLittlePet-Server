var express = require('express');
var async = require('async');
var router = express.Router();

var contentTable = require('../auth/db/Content/schema');
var eventTable = require('../auth/db/Event/schema');
var ObjectId = require('mongodb').ObjectId;

// 이벤트 전체 확인
router.get('/', function (req, res, next) {
    eventTable.find({}, (err, eventList) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err);
        }
        res.json(eventList)
    });
});

// 이벤트 세부 확인
router.get('/:eId', function (req, res, next) {
    let id = req.params.eId;

    eventTable.find({ _id: ObjectId(id) }, (err, eventList) => {
        res.json(eventList[0])
    });
});

// 이벤트 추가 (innerServer)
router.post('/', function (req, res, next) {
    let name = req.body.eName;
    let imageURL = req.body.eImageURL;
    let introduce = req.body.eIntroduce;
    let startDate = new Date(req.body.eStartDate).getTime();
    let endDate = new Date(req.body.eEndDate).getTime();
    console.log(imageURL);

    var eventData = new eventTable({
        eName: name,
        eImageURL: imageURL,
        eIntroduce: introduce,
        eStartDate: startDate,
        eEndDate: endDate,
        eAward: [],
        eContentList: []
    });

    eventData.save((err, data) => {
        res.json(eventData);
    });
});

// 이벤트 수정 (innerServer)
router.put('/', function (req, res, next) {
    let eId = req.body.eId;
    let newStartDate = new Date(req.body.eStartDate).getTime();
    let newEndDate = new Date(req.body.eEndDate).getTime();

    eventTable.findById({ _id: ObjectId(eId) }, (err, eventInfo) => {
        eventInfo.eName = req.body.eName || eventInfo.eName;
        eventInfo.eIntroduce = req.body.eIntroduce || eventInfo.eIntroduce;
        eventInfo.eStartDate = newStartDate || eventInfo.eStartDate;
        eventInfo.eEndDate = newEndDate || eventInfo.eEndDate;

        eventInfo.save((err, eventInfo) => {
            if (err) {
                console.log(err);
                res.status(500).send(err)
            }
            res.status(200).send(eventInfo);
        });
    });
});

// 해당 이벤트 항목의 컨텐츠 확인
router.get('/content/:eId', function (req, res, next) {
    let eventId = req.params.eId;
    console.log(req.body)

    contentTable.find({ cEid: eventId }, (err, contentList) => {
        if (err)
            res.status(500).send({ err: err });
        else {
            res.json(contentList);
        }
    });
});

// 이벤트 항목에 컨텐츠 추가
router.post('/content', function (req, res, next) {
    let userId = req.body.uId;
    let eventId = req.body.eId;
    let text = req.body.cText;
    let imageURL = req.body.cImageURL;

    console.log(req.body);

    var content = new contentTable({
        cOwner: userId,
        cDate: new Date().getTime(),
        cEid: eventId,
        cType: 1,
        cText: text,
        cTagList: getTagFromText(text),
        cGood: [],
        cImageURL: imageURL
    })

    content.save((err, contentData) => {
        if (err) {
            return res.status(500).send(err)
        }

        eventTable.update({ _id: ObjectId(eventId) }, { $addToSet: { eContentList: contentData._id } }, (err, result) => {
            if (err) {
                return res.status(500).send(err)
            }

            res.json(contentData);
        });
    });


});

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
