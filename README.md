# McMaster Prices Lookup

Simple Node app for reading a bill of materials excel file and scraping http://www.mcmaster.com/ for prices.

## Usage

This app is a NodeJS app built on Express. You can download NodeJS from it's website (http://nodejs.org/)

To use you'll need to download and install PhatomJS from http://phantomjs.org/. PhantomJS is used for scraping the McMaster website. Any other requirements can be downloaded with NPM.

## Bill of Materials

Ideally the bill of material excel file will have the following columns

| Part Number   | Quantity         | Price     | Package Quantity  | Total  |
| :------------ |:----------------:| :--------:| :----------------:| ------:|
| Part # 1      | # parts needed   |           |	               |        |
| Part # 2      | # parts needed   |           |                   |        |
| Part # 3      | # parts needed   |           |                   |        |

The app will use the part number and quantity to fill in the other 3 columns after scraping McMaster.

Any additional column will be ignored and any missing columns (except Part Number) will be ignored.

# License

[MIT License.](http://www.opensource.org/licenses/mit-license.php)