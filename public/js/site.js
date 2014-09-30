McMaster = function() {
	return {
		initUpload: function() {
			Dropzone.options.myAwesomeDropzone = {
				paramName: 'excel', // The name that will be used to transfer the file
				maxFilesize: 5, // MB
				acceptedFiles: '.xsl, .xlsx',
				success: function (file, response) {
					// Do I want to do it this way?
					$('body').html(response);
					$('.head h2').text(file.name);
					var stateObj = { page:"BOM" };
					history.pushState(stateObj, "spreadsheet", "");
				}
			};
		},
		initSpreadsheet: function(PartNumbers) {
			$('.actions #get-price').click(function(){
				$(this).addClass('disabled');
				McMaster.sendPartNumbers(PartNumbers);
			});

			$('.actions #export-table').click(function(){
				$('table').tableExport({type:'excel',escape:'false'});
			});

			window.onpopstate = function(event) {
				//refresh page
				location.reload();
			}
		},
		sendPartNumbers: function(partNumbers) {
			$('.part-number').each(function(index) {
				var current_number = $(this).text();
				if(current_number.length>0) {
					$(this).parent().find('.price').addClass('loading');
					$(this).parent().find('.pkg-qty').addClass('loading');
					setTimeout(function() {
						$.ajax({
							type: "POST",
							url: "/get-price",
							async: true,
							data: { partNumber: current_number }
						}).done(function(data) {
							if(data.error) {
								if(data.partNumber) {
									var id = '#'+partNumbers[data.partNumber];
									$(id).find('.price').removeClass('loading');
									$(id).find('.pkg-qty').removeClass('loading');
									$(id).find('.price').text("Not Found");
									$(id).find('.pkg-qty').text("Not Found");
									$(id).find('.total').text("$0.00");
									console.log("got an eror - "+current_number);
								} else {
									alert("Error parsing response");
								}
							} else {
								var id = '#'+partNumbers[data.partNumber];
								if(data.priceEach) {
									var price = data.priceEach.trim();
									if(price.indexOf('$') > -1) {
										price = price.substring('1');
									}
									price = price.substring(0,price.indexOf('.')+3);
									$(id).find('.price').removeClass('loading');
									$(id).find('.pkg-qty').removeClass('loading');
									$(id).find('.price').text('$'+price);
									if(isNaN(data.pkgQty)) { data.pkgQty = 1 }
									$(id).find('.pkg-qty').text(data.pkgQty);
									var needed = parseInt($(id).find('.quantity').text());
									var packages = Math.ceil(needed/data.pkgQty);
									$(id).find('.total').text('$'+(packages*price).toFixed(2));
								}

								if(data.catalogURL) {
									$(id).find('.catalog-url').html('<a href="'+data.catalogURL+'">LINK</a>');
								}
							}
						});
					}, 100);
				}
			});
		}
	};
}();