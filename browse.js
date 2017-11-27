const axios      = require('axios');
const xmlbuilder = require('xmlbuilder');
const get        = require('lodash.get');
const url        = require('url');
const xml2js     = require('xml2js');
const { Client } = require('node-ssdp');
const client     = new Client();

client.on('response', async (headers, statusCode, rinfo) => {
  let xml    = (await axios.get(headers.LOCATION)).data;
  let result = await parseXML(xml);

  let contentDirectory = get(result, 'root.device[0].serviceList[0].service[1]')
  if (! contentDirectory || get(contentDirectory, 'serviceType[0]') !== 'urn:schemas-upnp-org:service:ContentDirectory:1') {
    throw Error('unable to find content directory');
  }
  let parsed      = url.parse(headers.LOCATION);
  parsed.pathname = contentDirectory.controlURL[0];
  let controlURL  = url.format(parsed);

  // Browse the mediaserver.
  let xmlBody = buildRequestXml('0');
  try {
    let response = await axios.post(controlURL, xmlBody, {
      headers : {
        'content-type'   : 'text/xml; charset="utf-8"',
        'content-length' : xmlBody.length,
        soapaction       : '"urn:schemas-upnp-org:service:ContentDirectory:1#Browse"'
      }
    });
    let data = response.data;
    console.log('Got a proper response:\n\n', data);
  } catch(e) {
    console.log('browse request failed', e);
  }
}).search('urn:schemas-upnp-org:device:MediaServer:1');

function parseXML(xml) {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function buildRequestXml(id, options = {}) {
  // fill in the defaults
  if (!options.browseFlag) {
    options.browseFlag = 'BrowseDirectChildren';
  }

  if (!options.filter) {
    options.filter = '\\*';
  }

  if (!options.startIndex) {
    options.startIndex = 0;
  }

  if (!options.requestCount) {
    options.requestCount = 1000;
  }

  if (!options.sort) {
    options.sort = '';
  }

  // build the required xml
  return xmlbuilder.create('s:Envelope', { version: '1.0', encoding: 'utf-8' })
        .att('xmlns:s', 'http://schemas.xmlsoap.org/soap/envelope/')
        .att('s:encodingStyle', 'http://schemas.xmlsoap.org/soap/encoding/')
        .ele('s:Body')
        .ele('u:Browse', { 'xmlns:u': 'urn:schemas-upnp-org:service:ContentDirectory:1'})
        .ele('ObjectID', id)
        .up().ele('BrowseFlag', options.browseFlag)
        .up().ele('Filter', options.filter)
        .up().ele('StartingIndex', options.startIndex)
        .up().ele('RequestedCount', options.requestCount)
        .up().ele('SortCriteria', options.sort)
        .doc().end({ pretty: true, indent: '  '});
}

// node-ssdp unrefs 😡
setTimeout(() => {}, 1e6);