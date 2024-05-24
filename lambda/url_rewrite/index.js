function handler(event) {
    var request = event.request;
    console.log("before request="+JSON.stringify(request))

    var uri = request.uri;
    
    // Check whether the URI is missing a file name.
    if (uri.endsWith('/')) {
        request.uri = '/index.html';
    }
    // Check whether the URI is missing a file extension.
    else if (!uri.includes('.')) {
        request.uri = '/index.html';
    }

    console.log("after request="+JSON.stringify(request))

    return request;
}