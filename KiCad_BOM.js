#!/usr/bin/env node

let Kicad_bom = require('./lib/kicad_bom');

if (process.argv.length > 2) {
    let kicad_bom = new Kicad_bom(process.argv[2], process.argv[3]);
    kicad_bom.exec();
} else {
    console.log('Missing xml file!\nPlease run: kicad_bom <bom.xml>');
}
