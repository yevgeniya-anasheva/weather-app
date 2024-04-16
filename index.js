import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "https://api.openweathermap.org/data/2.5/"
const API_KEY = "34b9dd95deea316299a3cc3b4af911fe";

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

function time24to12Convert(time) {
  // Check correct time format and split into components
  const [hourString, minute] = time.split(":");
  const hour = +hourString % 24;
  return (hour % 12 || 12) + ":" + minute + (hour < 12 ? " AM" : " PM");
}

function dayConvert(day) {
  switch (day) {
    case 0:
      return "Sun";   
    case 1:
      return "Mon";
    case 2:
      return "Tue";
    case 3:
      return "Wed";
    case 4:
      return "Thu";
    case 5:
      return "Fri";
    case 6:
      return "Sat"; 
  }
}

function monthConvert(month) {
  switch (month) {
    case 0:
      return "Jan";
    case 1:
      return "Feb";
    case 2:
      return "Mar";
    case 3:
      return "Apr";
    case 4:
      return "May";
    case 5:
      return "Jun";
    case 6:
      return "Jul";
    case 7:
      return "Aug";
    case 8:
      return "Sep";
    case 9:
      return "Oct";
    case 10:
      return "Nov";
    case 11:
      return "Dec";
  }
}

app.get("/", (req, res) => {
  //TODO: get the default based on the user's location
  res.redirect("/london");
});

app.get("/:location", async (req, res) => {
  try {

    let result = await axios.get(`http://api.openweathermap.org/geo/1.0/direct?q=${req.params.location}&limit=1&appid=${API_KEY}`);
    let lat = result.data[0].lat;
    let lon = result.data[0].lon;

    let resultCurrentWeather = await axios.get(`${API_URL}weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    let resultDailyWeather = await axios.get(`${API_URL}forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);

    //TODO: instead of storing "loose" variables, create a controller / model and store data in an object
    //convert time to the location's timezone
    let offset = resultCurrentWeather.data.timezone;
    let convertedTime = resultCurrentWeather.data.dt + offset;
    let convertedDateObj = new Date(convertedTime * 1000);

    //variables needed for rendering current weather icon, whether it will be the Sun or the Moon
    let sunrise = new Date((resultCurrentWeather.data.sys.sunrise + offset) * 1000).getUTCHours();
    let sunset = new Date((resultCurrentWeather.data.sys.sunset + offset) * 1000).getUTCHours();
    let convertedHours = convertedDateObj.getUTCHours();
    
    let minutes = convertedDateObj.getUTCMinutes();
    let time24 = convertedDateObj.getUTCHours() + ":" + (minutes < 10 ? "0" + minutes : minutes);
    let time12 = time24to12Convert(time24);
    let dateFormatted = dayConvert(convertedDateObj.getUTCDay()) + " " + monthConvert(convertedDateObj.getUTCMonth()) + " " + convertedDateObj.getUTCDate();
    let convertedDateTime = dateFormatted + " - updated " + time12;
    
    let tempRounded = Math.round(resultCurrentWeather.data.main.temp);
    let feelsLikeRounded = Math.round(resultCurrentWeather.data.main.feels_like);

    let dailyMaxTempMap = new Map();
    let dailyMinTempMap = new Map();
    let dailyWeatherTempArr = resultDailyWeather.data.list;

    for (var i = 1, tempMax = dailyWeatherTempArr[i].main.temp_max, tempMin = dailyWeatherTempArr[i].main.temp_min; i < dailyWeatherTempArr.length; i++) {

      //the API gives 8 different temperature measures for one day, measured at every 3 hours. We need to compare days to sort through the array
      //to get the max and min for each day
      let currDay = new Date(dailyWeatherTempArr[i].dt * 1000).getUTCDay();
      let prevDay = new Date(dailyWeatherTempArr[i - 1].dt * 1000).getUTCDay();
      //keep changing max and min temperatures as long as it's the same day
      if(currDay === prevDay) {
        if(dailyWeatherTempArr[i].main.temp_max > dailyWeatherTempArr[i - 1].main.temp_max) {
          tempMax = dailyWeatherTempArr[i].main.temp_max;
        } 
        if(dailyWeatherTempArr[i].main.temp_min < dailyWeatherTempArr[i - 1].main.temp_min) {
          tempMin = dailyWeatherTempArr[i].main.temp_min;
        }
      } else {
        dailyMaxTempMap.set(prevDay, Math.round(tempMax));
        dailyMinTempMap.set(prevDay, Math.round(tempMin));
      }
      //add the last element
      if (i === dailyWeatherTempArr.length - 1) {
        dailyMaxTempMap.set(currDay, Math.round(tempMax));
        dailyMinTempMap.set(currDay, Math.round(tempMin));
      }
    }

    res.render("index.ejs", {
      currLocation: resultCurrentWeather.data.name, 
      currTemp: tempRounded,
      currStatus: resultCurrentWeather.data.weather[0].main,
      currDateTime: convertedDateTime,
      currHours: convertedHours,
      sunrise: sunrise,
      sunset: sunset,
      currFeelsLike: feelsLikeRounded,
      currWind: resultCurrentWeather.data.wind.speed,
      currHumidity: resultCurrentWeather.data.main.humidity,
      dailyWeather: resultDailyWeather.data.list,
      dailyMaxTemperatures: dailyMaxTempMap,
      dailyMinTemperatures: dailyMinTempMap
    });
  } catch (error) {
    console.log(error, error.stack);
  }
});

app.post("/", (req, res) => {
  //http://api.openweathermap.org/geo/1.0/zip?zip=E14,GB&appid={API key} zip code call
  console.log(req.body.location);
  res.redirect(`/${req.body.location}`);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});