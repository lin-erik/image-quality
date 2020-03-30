from flask import Flask, request, jsonify
import cv2
import numpy
api = Flask(__name__)


@api.route('/metrics', methods=['POST'])
def get_metrics():
    # Read file from request
    file = request.files['data'].read()
    # Convert file buffer to a numpy unsigned 8-bit array so OpenCV can decode
    npfile = numpy.frombuffer(file, numpy.uint8)
    # Decodes the npfile to a Mat data structure, -1 tells OpenCV to keep
    # original file color channels
    image = cv2.imdecode(npfile, -1)

    # The radius that we plan on applying Gaussian Blur
    radius = (19, 19)
    # Apply Gaussian Blur to image
    blurred = cv2.GaussianBlur(image, radius, 0)
    # Convert blurred to grayscale
    gray = cv2.cvtColor(blurred, cv2.COLOR_BGR2GRAY)
    # Applies laplacian to grayscale image and performs
    # calculation for deviation and variance under the hood
    # and exposes as .var()
    laplacian = cv2.Laplacian(gray, cv2.CV_64F).var()
    # Find least brightest region (minVal) and brightest region (maxVal)
    (minVal, maxVal, _, _) = cv2.minMaxLoc(gray)

    response = { "laplacian": round(laplacian, 2), "minVal": minVal, "maxVal": maxVal }
    return jsonify(response)

if __name__ == '__main__':
    api.run()