'use strict';

const Homey = require('homey');
const url = require('url');
const http = require('http');
const xmltojs = require('xml2js');
const browseServer = require('./lib/index.js');
const nodessdp = require('node-ssdp').Client;
const node_ssdp_client = new nodessdp();
const x2js = require ('x2js.js');
const mediaServerName = process.argv[2];

class SynologyMusic extends Homey.App {
	
	onInit() {
		
		this.log('MyApp is running...');
		
		var done = false;
		node_ssdp_client.on('response', function (headers, statusCode, rinfo) {
			const requestUrl = url.parse(headers.LOCATION);
			const httpOptions =  {
				host: requestUrl.hostname,
				port: requestUrl.port,
				path: requestUrl.pathname
			}

		const req = http.request(httpOptions, function(response) {
		var data = '';
		console.log("response ontvangen");
		response.on('data', function(newData) {
			//console.log(newData)
			data = data + newData;
		});

		response.on('end', function() {
			console.log(data)
			if (done == true) {
				return;
			}
			if (data != "") { //catch data is null, win10 server gives this
			xmltojs.parseString(data, function(err, result) {
				console.log("xmltojs");
				console.log(result.root.device[0])
				console.log("mediaservername");
				console.log(mediaServerName)
				console.log("")
				//if(result.root.device[0].friendlyName.toString() === mediaServerName) {    => why???
				if(result.root.device[0].friendlyName.toString() != null ) {
					console.log("server found");
					//console.log(result.root.device[0]);
					done = true;
					console.log("service-list")
					console.log(result.root.device[0].serviceList[0])
					console.log(result.root.device[0].serviceList[0].service.length, " services")
					if (result.root.device[0].serviceList[0].service[1].serviceType[0] === 'urn:schemas-upnp-org:service:ContentDirectory:1') { //not only on service 0 or 1 of list?
						console.log("contentdirectory found");
						console.log("controlURL")
						//console.log(result.root.device[0].serviceList[0].service[1].controlURL[0]);
						const controlUrl = 'http://' + requestUrl.hostname + ':' + requestUrl.port + result.root.device[0].serviceList[0].service[1].controlURL[0];
						console.log ("controlurl", controlUrl);
						browseServer('0', controlUrl, {}, function(err, result) {
							console.log("browse server");
							console.log(result);
							if (err) {
								console.log(err);
								return;
							}

							if (result.container) {
								for (let i = 0; i < result.container.length; i++) {
									console.log('Container:' + result.container[i].id);
								}
							}

							if (result.item) {
								for (let i = 0; i < result.item.length; i++) {
									console.log('Item:' + result.item[i].title);
								}
							}
						});
					};
				};
			});
			}; //end catch data is null
		});
		});
		req.on('error', function(err) {
			console.log(err);
		});
		req.end();
		});
	
		// search for media server and display top level content
		node_ssdp_client.search('urn:schemas-upnp-org:device:MediaServer:1');
		setTimeout(function() {
			console.log('done');
		}, 10000);
  
	};
};

module.exports = SynologyMusic;