var system = require('system');
var page = require('webpage').create();

// var part = { partNumber: PART NUMBER, catalogURL: URL FOR PART, count: NUMBER OF TIMES WE'VE TRIED TO SCRAPE };
var command = system.args[1];
part = JSON.parse(command);

page.open(part.catalogURL, function (status) {
	page.onConsoleMessage = function(msg) {
		system.stderr.writeLine(msg);
	};
	if (status !== 'success') {
		console.log('Unable to access network');
	} else {
		page.switchToFrame(2);
		page.switchToFrame(2);
		page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js", function() {
			var newPart = page.evaluate(function(part) {
				var pkgQtyFlag = false;
				$('thead tr td').each(function(i, col) {
					if($(col).text().toLowerCase().search("qty")>-1) {
						pkgQtyFlag = true;
					}
				});
				$('.PartNbrLnk').each(function(i,catalogPart) {
					if($(catalogPart).text().toString() == part.partNumber) {

						if(pkgQtyFlag && $(catalogPart).parent().parent().find('.ItmTblColSpaceSpecBefrPartNbr').text().length>0) {
							part.pkgQty = $(catalogPart).parent().parent().find('.ItmTblColSpaceSpecBefrPartNbr').text();
						} else {
							part.pkgQty = 1;
						}

						if($(catalogPart).parent().parent().find('.ItmTblCellPrce').text().length>0) {
							part.priceEach = $(catalogPart).parent().parent().find('.ItmTblCellPrce').text();
						}
					}
				});
				return part;	
			}, part);
			console.log(JSON.stringify(newPart));
			phantom.exit();
		});
	}
});