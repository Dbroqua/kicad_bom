let fs = require('fs'),
    path = require('path'),
    xml2js = require('xml2js');


/**
 * A class that can convert XML bom into CSV file
 */
class kicad_bom {
    /**
     * Constructor, received xml file path and csv file path (optional)
     * @param {String} bomfile XML file path
     * @param {String} [csvfile] CSV output file path
     */
    constructor(bomfile, csvfile) {
        this.bomfile = path.join(path.resolve(process.cwd()), bomfile);
        if (csvfile !== undefined) {
            this.csvfile = path.join(path.resolve(process.cwd()), (csvfile || 'bom.csv'));
        }
        this.components = [];
        this.grouped = {};
    }

    _createCSVFile(callback) {
        let that = this,
            dataToWrite = '';

        //Header:
        dataToWrite +=
            'Mfr Part Number (Input),Manufacturer Part Number,Mouser Part Number,Manufacturer Name,Description,Quantity 1,Unit Price 1,Quantity 2,Unit Price 2,Quantity 3,' +
            'Unit Price 3,Quantity 4,Unit Price 4,Quantity 5,Unit Price 5,Order Quantity,Order Unit Price,Min./Mult.,Availability,Lead Time in Days,Lifecycle,NCNR,RoHS,Pb Free,' +
            'Package Type,Datasheet URL,Product Image,Design Risk\n';

        for (let key in that.grouped) {
            if (that.grouped.hasOwnProperty(key)) {
                let row = that.grouped[key];
                dataToWrite += ',' + row.manf + ',,,' + row.ref + ',' + row.qte + ',,,,,,,,,,,,,,,,,,,,' + row.datasheet + ',,\n';
            }
        }

        fs.writeFile(that.csvfile, dataToWrite, 'utf8', function(err) {
            if (err) {
                callback(err, {
                    code: 500,
                    res: {
                        message: 'Error when trying to create csv file'
                    }
                });
            } else {
                callback(null, {
                    code: 201,
                    res: that.csvfile
                });
            }
        });

    }

    _readBOM(callback) {
        let that = this,
            parser = new xml2js.Parser();

        if (that.bomfile !== undefined) {
            fs.readFile(that.bomfile, function(err, data) {
                parser.parseString(data, function(err, result) {
                    if (err) {
                        callback(err, result);
                    } else {
                        let nbComponents = result.export.components[0].comp.length;
                        for (let i = 0; i < nbComponents; i++) {
                            let _component = result.export.components[0].comp[i];
                            if (_component.value !== undefined) {
                                let _tmpComponent = {
                                    value: _component.value[0],
                                    ref: _component.$.ref,
                                    datasheet: (_component.datasheet !== undefined ? _component.datasheet[0] : '')
                                };
                                if (_component.fields !== undefined) {
                                    for (let j = 0; j < _component.fields.length; j++) {
                                        let _field = _component.fields[j];
                                        if (_field.field[0].$ !== undefined && _field.field[0].$.name.toLowerCase() === 'manf#') {
                                            _tmpComponent.manf = _field.field[0]._;
                                            break;
                                        }
                                    }

                                    if (_tmpComponent.manf !== undefined) {
                                        if (that.grouped[_tmpComponent.manf] === undefined) {
                                            that.grouped[_tmpComponent.manf] = _tmpComponent;
                                            that.grouped[_tmpComponent.manf].qte = 0;
                                        }
                                        that.grouped[_tmpComponent.manf].qte++;
                                        that.grouped[_tmpComponent.manf].value += ' ' + _tmpComponent.value;
                                        that.grouped[_tmpComponent.manf].ref += ' ' + _tmpComponent.ref;
                                    }
                                }
                                that.components.push(_tmpComponent);
                            }
                        }
                        callback(null, {
                            code: 200,
                            res: {
                                components: that.components,
                                grouped: that.grouped
                            }
                        });
                    }
                });
            });
        } else {
            let _err = {
                code: 406,
                ress: {
                    message: 'Missing xml file'
                }
            };
            callback(_err, _err);
        }
    }

    /**
     * Entry point when using kicad_bom as bin
     */
    exec() {
        let that = this;
        if (that.csvfile === undefined) {
            that.csvfile = path.join(path.resolve(process.cwd()), 'bom.csv');
        }
        this._readBOM(function(err, res) {
            if (err) {
                console.error('Error when trying to read xml file');
                return false;
            }
            that._createCSVFile(function(err, res) {
                if (err) {
                    console.error('Error whein trying to create csv file!');
                    return false;
                } else {
                    console.log('CSV file (', res.res, ') generated!');
                }
            });
        });
    }

    /**
     * Entry point when using kicad_bom as module
     * @param {Function} callback
     */
    convert(callback) {
        let that = this;
        this._readBOM(function(err, res) {
            if (err) {
                console.error('Error when trying to read xml file');
                return false;
            }
            if (that.csvfile !== undefined) {
                that._createCSVFile(function(err, res) {
                    callback(err, res);
                });
            } else {
                callback(null, {
                    code: 200,
                    res: {
                        components: that.components,
                        grouped: that.grouped
                    }
                });
            }

        });
    }
}

module.exports = kicad_bom;
