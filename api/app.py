from flask import Flask, request, jsonify
import cv2
import numpy
api = Flask(__name__)


@api.route('/metrics', methods=['POST'])
def get_metrics():
    file = request.files['data'].read()
    npfile = numpy.frombuffer(file, numpy.uint8)
    image = cv2.imdecode(npfile, -1)

    blurred = cv2.GaussianBlur(image, (19, 19), 0)
    gray = cv2.cvtColor(blurred, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F).var()
    (minVal, maxVal, _, _) = cv2.minMaxLoc(gray)

    response = { "laplacian": round(laplacian, 2), "minVal": minVal, "maxVal": maxVal }
    return jsonify(response)

if __name__ == '__main__':
    api.run()