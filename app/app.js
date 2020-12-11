'use strict';

// declare the app and DI the right modules
var app = angular.module("app", ['ui.bootstrap', 'ngAnimate', 'angularMoment']);

// main controller, we're going to stuff everything in here
// and not use a service... yet... TODO
app.controller('slackCustomCtrl', function ($scope, $http, $timeout, moment) {
  // setup defaults for when the app loads
  $scope.slacktoken = '';
  $scope.settingStatus = false;
  $scope.toggleNewEmoji = false;
  $scope.toggleSettings = false;
  $scope.firstTime = false;
  $scope.set = {
    needHelp: false
  }
  $scope.form = {};
  $scope.setting = {};
  $scope.alerts = [];
  $scope.slackstatuses = [];
  $scope.timeNow = moment();

  // main function to start the app logic
  $scope.initializeApp = function () {
    // clear previous alerts on init
    $scope.alerts = [];
    // uncomment below to clear out local storage for app, for testing
    // chrome.storage.local.clear();

    // determine if user stored token in storage
    chrome.storage.local.get('slacktoken', function (result) {
      if (result.slacktoken) {
        $scope.slacktoken = result.slacktoken; // set the token if found, so it can be used in api calls
        $scope.setting.token = result.slacktoken; // also populate it into settings
        $scope.firstTime = false; // not the first rodeo, so don't need to show setup in the view
        $scope.loadCustomStatus(); // since we have a token, let's determine if they've also stored statuses
        $scope.getUserDetails(); // since we have a token, let's figure out the user's details

      } else {
        $scope.firstTime = true; // let's show setup in view since it's their first time
        $scope.$apply(); // need this to make AngularJS change the view, not entirely sure why 
      }
    });
    
    // determine if user stored preferred time format
    chrome.storage.local.get('timeformat', function (result) {
      if (result.timeformat) {
        $scope.setting.timeFormat = result.timeformat; // populate desired time format into settings
      } else {
        $scope.setting.timeFormat = 'h:mm:ss a'; // poplate this as default
      }
    });

  }
  
  // get pertinent info on user
  $scope.getUserDetails = function () {
    // setup json for POST request to slack api
    var req = {
      method: 'POST',
      // https://api.slack.com/methods/auth.test
      url: 'https://slack.com/api/auth.test',
      params: {
        'token': $scope.slacktoken,
        'pretty': 1
      }
    }
    $http(req).then(function successCallback(response) {
      // stick the api response in scope for display/linking
      $scope.userDetails = response;
      // check the response from slack to see if we can auth
      if (response.data.ok == false) { // if not... alert the user
        $scope.addAlert('danger', 'Failed to authenticate with token ' + response.config.params.token);
        $scope.firstTime = true; // let's treat the user as if it's their first time if auth failed
        $scope.$apply();
      } else {
        $scope.user_id = response.data.user_id; // things are good, let's set the user_id         
        $scope.getCurrentStatus(); // now that we can auth, we can check the status
      }
    }, function errorCallback(response) {
      $scope.addAlert('danger', 'User not authed: ' + response);
    });
  }

  /* 
   * CHROME/FORM FUNCTIONS 
   */

  // check local storage for statuses and update view
  $scope.loadCustomStatus = function () {
    chrome.storage.local.get('statuses', function (result) {
      if (result.statuses) { // the user has stored statuses
        $scope.slackstatuses = result.statuses; // update scope with the stored statuses
        $scope.$apply();
      } else {
        $scope.$apply(); // slackstatuses will be empty, so we'll use that empty scope to show add status
      }
    });
  }

  // push the new status into scope and then set updated scope into storage object
  $scope.addEmoji = function () {
    $scope.slackstatuses.push({
      short: sanitizeEmoji($scope.form.emoji),
      text: $scope.form.text,
      pres: $scope.form.pres,
      snooze: $scope.form.snooze
    });
    $scope.toggleNewEmoji = false; // turn the toggle off so it disappears in view
    $scope.form = {}; // reset the form to empty
    // update storage with the updated scope that has new status
    chrome.storage.local.set({
      'statuses': $scope.slackstatuses
    }, function (result) {
      console.log("Set emoji");
    });
  }

  // delete status from scope and storage
  // pass the index so we can manipulate the right "row" of scope
  $scope.removeEmoji = function (index) {
    $scope.slackstatuses.splice(index, 1); // use splice to remove the correct row
    // now set storage to updated statuses
    chrome.storage.local.set({
      'statuses': $scope.slackstatuses
    }, function (result) {
      console.log("Set emoji after removing one");
    });
  }

  // allow for "editing" an existing status
  // but really, we're just destroying the status but first using it
  // to re-populate the add form so they can add it back with changes
  $scope.editEmoji = function (index, short, text, pres, snooze) {
    $scope.slackstatuses.splice(index, 1); // use splice to remove the correct row
    // also update the storage with the new set of statuses
    chrome.storage.local.set({
      'statuses': $scope.slackstatuses
    }, function (result) {
      console.log("Edit emoji after removing one");
    });
    // flip the toggle so the view opens the form
    $scope.toggleNewEmoji = true;
    // do checks on if a value is present so form can be pre-populated
    if (text) {
      $scope.form.text = text;
    }
    if (pres) {
      $scope.form.pres = pres;
    }
    if (short) {
      $scope.form.emoji = short;
    }
    if (snooze) {
      $scope.form.snooze = snooze;
    }
  }
  
  // let's give this emoji the best chance to succeed
  var sanitizeEmoji = function (emoji) {
    // remove any colons (since we include them already) and convert to lower case
    var sanitizedEmoji = emoji.replace(/:/g, "").toLowerCase();
    // returns the new and improved value
    return sanitizedEmoji;
  }

  // if they change a setting
  $scope.changeSetting = function () {
    // update local storage with the token they entered
    chrome.storage.local.set({
      'slacktoken': $scope.setting.token
    }, function (result) {
      // it's no longer their first time
      $scope.firstTime = false;
      // we should also close settings div upon submit
      $scope.toggleSettings = false;
    });
    
    // also update their desired timeformate
    chrome.storage.local.set({
      'timeformat': $scope.setting.timeFormat
    }, function (result) {
      // that's it!
    });    
    
    // since they may have updated the token, we should restart the whole thing    
    $scope.initializeApp();
  }  
  
  /* 
   * PRESENCE 
   */  
  
  // get current presence (active/away) for user
  $scope.getPresenceStatus = function () {
    // setup json for POST request to slack api
    var req = {
      method: 'GET',
      // https://api.slack.com/methods/users.getPresence
      url: 'https://slack.com/api/users.getPresence',
      params: {
        'token': $scope.slacktoken
      }
    }
    $http(req).then(function successCallback(response) {
      console.log(response.data);
      if (response.data.ok == true) {
        // if so, update scope with end time of snooze so we can display in view
        $scope.currentUserPresence = response.data.presence;
      } else {
        // if not, set to undefined so nothing appears in view
        $scope.addAlert('danger', 'Unable to get user presence because ' + response.data);
      }
    }, function errorCallback(response) {
      // for debugging
      $scope.addAlert('danger', 'Unable to get user presence because ' + response);
    });
  }  

  // set user's presence
  $scope.setPresence = function (pres) {
    // default should be auto if nothing passed
    var presence = 'auto';
    // if checkbox checked, then set to auto
    if (pres == true) {
      var presence = 'auto';
    } else {
      var presence = 'away';
    }
    // setup json for POST request to slack api
    var req = {
      method: 'POST',
      // https://api.slack.com/methods/users.setPresence
      url: 'https://slack.com/api/users.setPresence',
      params: {
        'token': $scope.slacktoken,
        'presence': presence // can be auto or away
      }
    }
    $http(req).then(function successCallback(response) {
      // for debugging
      $scope.theSetPresence = response.data;
      // let's verify the current status a short time after the presence gets set
      $timeout(function () {
        $scope.getCurrentStatus(); // call on function to verify current slack status
      }, 800);
    }, function errorCallback(response) {
      // error
    });
  }  
  
  /* 
   * STATUS 
   */  
  
  // check current status (text/emoji) for user
  $scope.getCurrentStatus = function () {
    // show spinner gif to indicate we're working
    $scope.settingStatus = true;
    // setup json for POST request to slack api
    var req = {
      method: 'POST',
      // https://api.slack.com/methods/users.profile.get
      url: 'https://slack.com/api/users.profile.get',
      params: {
        'token': $scope.slacktoken,
        'pretty': 1
      }
    }
    $http(req).then(function successCallback(response) {
      // put the profile json in scope for view
      $scope.currentUserStatus = response.data.profile;
      // stop the spinner since we're done
      $scope.settingStatus = false;
      $scope.getSnoozeStatus(); // now that we can auth, we can check the snooze status
      $scope.getPresenceStatus(); // now that we can auth, we can check the active status
    }, function errorCallback(response) {
      // for debugging
      $scope.currentUserStatus = response;
    });
  }    
  
  // tell slack about the status we want to set
  $scope.setStatus = function (short, text, pres, snooze) {
    // enable the spinner gif to indicate work is being done
    $scope.settingStatus = true;
    // check if time placeholder exists and there's snooze
    if (text) {
      if (text.includes("%t") && snooze) {
        // setup snooze time to get current time then add snooze mins then format chosen in settings
        var snoozeTime = moment().add(snooze, 'minutes').format($scope.setting.timeFormat);
        // locate the placeholder and replace it with snooze time
        var text = text.replace(/%t/g, snoozeTime);
      }
    }
    // setup json for POST request to slack api
    var req = {
      method: 'POST',
      // https://api.slack.com/methods/users.profile.set
      url: 'https://slack.com/api/users.profile.set',
      params: {
        'token': $scope.slacktoken, // use token we got from storage
        'profile': {
          "status_text": text,
          "status_emoji": ":" + short + ":"
        }, // build out profile string
        'user': $scope.user_id // specify user id, though this isnt completely necessary
      }
    } // submit the POST via AngularJS' awesome $http service
    $http(req).then(function successCallback(response) {
      // check if slack liked our request
      if (response.data.ok == false) {
        // if we got a false, that means it failed to update, so let's inform the user
        $scope.addAlert('danger', 'Failed to update status because ' + response.data.error);
        // stop the spinner
        $scope.settingStatus = false;
      } else {
        // this is just for debugging if needed
        $scope.theSetStatus = response.data.ok;
        // call on setpresence now that status is up-to-date
        $scope.setPresence(pres);
        // check if snooze is included
        if (snooze) {
          $scope.setSnooze(snooze);
        } else { // if not, let's remove by default (could be an optional setting in future?)
          $scope.removeSnooze();
        }
        // use moment js to set date time to now for scope tracking
        $scope.lastStatusSetTime = moment();
      }
    }, function errorCallback(response) {
      // error
    });
  }
  
  /* 
   * SNOOZE 
   */    
  
  // get current snooze for user
  $scope.getSnoozeStatus = function () {
    // setup json for POST request to slack api
    var req = {
      method: 'GET',
      // https://api.slack.com/methods/dnd.info
      url: 'https://slack.com/api/dnd.info',
      params: {
        'token': $scope.slacktoken
      }
    }
    $http(req).then(function successCallback(response) {
      // check if snooze enabled, since otherwise snooze_endtime is unavailable
      if (response.data.snooze_enabled == true) {
        // if so, update scope with end time of snooze so we can display in view
        $scope.snoozeTimeReturnUnix = response.data.snooze_endtime;
      } else {
        // if not, set to undefined so nothing appears in view
        $scope.snoozeTimeReturnUnix = undefined;
      }
    }, function errorCallback(response) {
      // for debugging
      $scope.theCurrentSnoozeStatus = response;
    });
  }  

  // tell slack how long to snooze for
  $scope.setSnooze = function (snooze) {
    // setup json for GET request to slack api
    var req = {
      method: 'GET',
      // https://api.slack.com/methods/dnd.setSnooze
      url: 'https://slack.com/api/dnd.setSnooze',
      params: {
        'token': $scope.slacktoken,
        'num_minutes': snooze // must be in minutes
      }
    }
    $http(req).then(function successCallback(response) {
      // for debugging
      $scope.theSetSnooze = response.data;
      // catch an error
      if (response.data.ok == false) {
        // if we got a false, that means it failed to update, so let's inform the user
        $scope.addAlert('danger', 'Failed to update snooze because ' + response.data.error);
      } else {
        // if all's well, let's present the snooze return time
        $scope.snoozeTimeReturnUnix = response.data.snooze_endtime;
      }
    }, function errorCallback(response) {
      // error
    });
  }

  // tell slack we want to stop snoozing
  $scope.removeSnooze = function () {
    // setup json for GET request to slack api
    var req = {
      method: 'POST',
      // https://api.slack.com/methods/dnd.endSnooze
      url: 'https://slack.com/api/dnd.endSnooze',
      params: {
        'token': $scope.slacktoken
      }
    }
    $http(req).then(function successCallback(response) {
      // for debugging
      $scope.theRemoveSnooze = response.data;
      // catch an error
      if (response.data.ok == false) {
        // catch meaningless error that users don't care about
        if (response.data.error == 'snooze_not_active') {
          // act normal and set this to undefined to remove from view
          $scope.snoozeTimeReturnUnix = undefined;
        } else {
          // if we got a false, that means it failed to remove, so let's inform the user
          $scope.addAlert('danger', 'Failed to remove snooze because ' + response.data.error);
        }
      } else {
        // if all's well, let's set time to undefined to remove from view
        $scope.snoozeTimeReturnUnix = undefined;
      }
    }, function errorCallback(response) {
      // error
    });

  }

  /* 
   * ALERTS 
   */     
  
  // setup an alerting system to give user feedback when something needs attention
  $scope.addAlert = function (alertType, alert) {
    // push an alert into scope that will show in view
    $scope.alerts.push({
      type: alertType,
      msg: alert
    });
  };

  // so users can dismiss alerts
  $scope.closeAlert = function (index) {
    $scope.alerts.splice(index, 1);
  };

  

  // alright baby, let's see what you can do!
  $scope.initializeApp();

});
