/*jslint laxbreak: true */

var fs, vm, sandbox, jslintCore = 'jslint-core.js';

if (typeof require !== 'undefined') {
    print = require('util').puts;
    fs = require('fs');
    vm = require('vm');
    sandbox = {};
    res = vm.runInNewContext(fs.readFileSync(jslintCore), sandbox, jslintCore);
    JSLINT = sandbox.JSLINT;
} else {
    load('jslint-core.js');
}

// Import extra libraries if running in Rhino.
if (typeof importPackage != 'undefined') {
    importPackage(java.io);
    importPackage(java.lang);
}

var readSTDIN = (function() {
    // readSTDIN() definition for nodejs
    if (typeof process != 'undefined' && process.openStdin) {
        return function readSTDIN(callback) {
            var stdin = process.openStdin()
              , body = [];

            stdin.on('data', function(chunk) {
                body.push(chunk);
            });

            stdin.on('end', function(chunk) {
                callback(body.join('\n'));
            });
        };

    // readSTDIN() definition for Rhino
    } else if (typeof BufferedReader != 'undefined') {
        return function readSTDIN(callback) {
            // setup the input buffer and output buffer
            var stdin = new BufferedReader(new InputStreamReader(System['in'])),
                lines = [];

            // read stdin buffer until EOF (or skip)
            while (stdin.ready()){
                lines.push(stdin.readLine());
            }

            callback(lines.join('\n'));
        };

    // readSTDIN() definition for Spidermonkey
    } else if (typeof readline != 'undefined') {
        return function readSTDIN(callback) {
            var line
              , input = []
              , emptyCount = 0
              , i;

            line = readline();
            while (emptyCount < 25) {
                input.push(line);
                if (line) {
                    emptyCount = 0;
                } else {
                    emptyCount += 1;
                }
                line = readline();
            }

            input.splice(-emptyCount);
            callback(input.join('\n'));
        };
    }
})();

readSTDIN(function(body) {
    var ok = JSLINT(body)
      , i
      , j
      , error
      , errorType
      , nextError
      , errorCount
      , WARN = 'WARNING'
      , ERROR = 'ERROR';

    var errors = [],
        unused = [],
        result = [];

    if (!ok && JSLINT.errors) {
        errorCount = JSLINT.errors.length;
        JSLINT.errors.forEach(function (error, i, all) {
            errorType = WARN;
            nextError = all[i+1];
            if (error && error.reason && error.reason.match(/^Stopping/) === null) {
                // If jslint stops next, this was an actual error
                if (nextError && nextError.reason && nextError.reason.match(/^Stopping/) !== null) {
                    errorType = ERROR;
                }
                errors.push([error.line, error.character, errorType, error.reason]);
            }
        });
    }

    var data = JSLINT.data();
    if (data && data.unused) {
        data.unused.forEach(function (x, i, a) {
            if (x && x.name) {
                var errorReason = '';
                if (x.name == 'extra_param') {
                    errorReason = "Unused function argument in " + x['function'];
                } else if (x.name === 'unused_variable') {
                    errorReason = "Unused variable in " + x['function'];
                }

                if (errorReason) {
                    unused.push([x.line, 1, WARN, errorReason]);
                }
            }
        });
    }

    i = j = 0;
    var next1 = null, next2 = null;
    while (i < errors.length || j < unused.length) {
        next1 = errors[i];
        next2 = unused[j];
        if (!next1) {
            result.push(next2);
            j += 1;
        } else if (!next2) {
            result.push(next1);
            i += 1;
        } else if (next1[0] <= next2[0]) {
            result.push(next1);
            i += 1;
        } else {
            result.push(next2);
            j += 1;
        }
    }
    result.forEach(function (x, i, a) {
        if (x) {
            print(x.join(":"));
        }
    });
});
