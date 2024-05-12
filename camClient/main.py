import numpy as np
from ultralytics import YOLO
import cv2
import cvzone
import math
from sort import *
import requests

deltaX = 100
deltaY = 100


def sortDeskByPosition(posList: list) -> list:
    xList = [i[0] for i in posList]
    yList = [i[1] for i in posList]
    maxX = max(xList)
    minX = min(xList)
    maxY = max(yList)
    minY = min(yList)
    # print(posList)
    result = []
    for i in range(int((maxY - minY) / deltaY) + 1):
        for j in range(int((maxX - minX) / deltaX) + 1):
            x1 = j * deltaX + minX
            x2 = (j + 1) * deltaX + minX
            y1 = i * deltaY + minY
            y2 = (i + 1) * deltaY + minY
            for n in posList:
                if x1 <= n[0] < x2 and y1 <= n[1] < y2:
                    result.append(n[2])
    # print(minX, minY, x2, y2)
    return result


def isCrashBetween(p1, p2):
    if p1[2] < p2[0] or p1[0] > p2[2]:
        return 0
    if p1[3] < p2[1] or p1[1] > p2[3]:
        return 0
    return 1


def getCrashSeatIndex(person, seats):
    for i in range(len(seats)):
        x1, y1, x2, y2, Id = seats[i]
        if isCrashBetween(person, [x1, y1, x2, y2]):
            return i
    return -1

cap = cv2.VideoCapture(0)  # For Webcam
cap.set(3, 1280)
cap.set(4, 720)

# cap = cv2.VideoCapture("cars.mp4")

model = YOLO("../Yolo-Weights/yolov8n.pt")

classNames = [
    "person",
    "bicycle",
    "car",
    "motorbike",
    "aeroplane",
    "bus",
    "train",
    "truck",
    "boat",
    "traffic light",
    "fire hydrant",
    "stop sign",
    "parking meter",
    "bench",
    "bird",
    "cat",
    "dog",
    "horse",
    "sheep",
    "cow",
    "elephant",
    "bear",
    "zebra",
    "giraffe",
    "backpack",
    "umbrella",
    "handbag",
    "tie",
    "suitcase",
    "frisbee",
    "skis",
    "snowboard",
    "sports ball",
    "kite",
    "baseball bat",
    "baseball glove",
    "skateboard",
    "surfboard",
    "tennis racket",
    "bottle",
    "wine glass",
    "cup",
    "fork",
    "knife",
    "spoon",
    "bowl",
    "banana",
    "apple",
    "sandwich",
    "orange",
    "broccoli",
    "carrot",
    "hot dog",
    "pizza",
    "donut",
    "cake",
    "chair",
    "sofa",
    "pottedplant",
    "bed",
    "diningtable",
    "toilet",
    "tvmonitor",
    "laptop",
    "mouse",
    "remote",
    "keyboard",
    "cell phone",
    "microwave",
    "oven",
    "toaster",
    "sink",
    "refrigerator",
    "book",
    "clock",
    "vase",
    "scissors",
    "teddy bear",
    "hair drier",
    "toothbrush",
]
# mask = cv2.imread("mask.png")

# Tracking
tracker = Sort(max_age=20, min_hits=3, iou_threshold=0.3)

# limits = [400, 297, 673, 297]
# totalCount = []

while True:
    # success, img = cap.read(1)
    img = cv2.imread("dddd.png")
    results = model(img, stream=True)
    detections = np.empty((0, 6))
    resultPerson = []

    for r in results:
        boxes = r.boxes
        for box in boxes:

            # 경계 박스
            x1, y1, x2, y2 = box.xyxy[0]
            x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            # cv2.rectangle(img, (x1, y1), (x2, y2), (255, 0, 255), 3)
            w, h = x2 - x1, y2 - y1

            # 신뢰도
            conf = math.ceil((box.conf[0] * 100)) / 100  # 소숫점2자리

            # 클래스 이름
            cls = int(box.cls[0])
            currentClass = classNames[cls]

            if (
                currentClass == "diningtable"
                or currentClass == "book"
                or currentClass == "chair"
                and conf > 0.3
            ):
                # cvzone.putTextRect(img,f'{classNames[cls]}{conf}',(max(0,x1),max(35,y1)),scale=0.6,thickness=1,offset=3)
                # 좌석일 경우
                cvzone.cornerRect(img, (x1, y1, w, h), l=9)
                currentArray = np.array([x1, y1, x2, y2, conf, 0])
                detections = np.vstack((detections, currentArray))
            elif currentClass == "person" and conf > 0.3:
                cvzone.cornerRect(img, (x1, y1, w, h), l=9)
                # currentArray = np.array([x1, y1, x2, y2, conf])
                # detections = np.vstack((detections, currentArray))
                resultPerson.append([x1, y1, x2, y2, conf])

    positionList = []
    seatsList = []
    resultsTracker = tracker.update(detections)
    cls = int(box.cls[0])
    # print(resultPerson)

    for i in range(len(resultsTracker)):
        # 좌석
        x1, y1, x2, y2, Id = resultsTracker[i]
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        positionList.append([x1, y1, i])
        seatsList.append([x1, y1, x2, y2, int(Id), 0])
        # print(result)
        w, h = x2 - x1, y2 - y1
        cvzone.cornerRect(img, (x1, y1, w, h), l=9, rt=2, colorR=(255, 0, 0))
        cvzone.putTextRect(
            img,
            f"{classNames[cls]}{int(Id)}",
            (max(0, x1), max(35, y1)),
            scale=2,
            thickness=1,
            offset=10,
        )

    print()
    #좌석 배치에 따라 정렬하기
    sortedIndexes = sortDeskByPosition(positionList)
    for person in resultPerson:
        # 충돌한 의자 고윳값 찾기
        index = getCrashSeatIndex(person, resultsTracker)
        seatsList[index][5] = 1 # 충돌한 의자의 충돌 여부를 1로 설정

    data = []
    for i in sortedIndexes:
        data.append(seatsList[i][5])

    # print(data)
    try:
        response = requests.post("http://127.0.0.1:5500/set/data", data={"data": data})
    except:
        pass
    cv2.imshow("Image", img)
    cv2.waitKey(1)
