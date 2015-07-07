Angular-Ticket
==============

<h1> --- Depreciate --- </h1>

AngualrJS Ticketing Software

<hr>

<h4>Description</h4>
<p>
  AngularJS & Firebase ticketing system with live ticket & wallboard functionality. Currently in development!!. This application utilizes the very latest version of AngularJS & AngularFire.
</p>

<p>
  <ul>
    <li>AngularJS 1.2.12</li>
    <li>AngularFire 8.0</li>
  </ul>
</p>

<hr>

<h2>Demo</h2>
<p>
  https://angular-ticket.firebaseapp.com/
</p>

<b>demo agent email:</b> demo@demo.com
<br/>
<b>demo agent pass:</b> demo

<hr>

<h3>Setup</h3>

<p>
  <ul>
    <li>Setup a firebase account</li>
    <li>Setup agents within the firebase static login section</li>
    <li>Within firebase data section import the config below (This sets up the groups, modify this how you like)</li>
    <li>Within the Security rules section add the security rules below</li>
    <li>Download the repository from GitHub and add the static files to a server (Dont forget to allow this server to connect to firebase within the firebase setup</li>
    <li>Open app.js and change line 6 to your firebase URL</li>
  </ul>
</p>

<p>
  "config" : {
    "groups" : [ "Hardware", "Server", "Phones" ]
  }
</p>

<p>
{
  "rules": {
    "tickets": {
      "open": {
        ".read": "auth !== null",
        ".write": true,
        "$ticketID":{
          ".read": true
        }
      },
      "closed": {
        ".read": "auth !== null",
        ".write": "auth !== null"
      }
    },
    "config":{
      ".read": true,
      ".write": "auth !== null"
    },
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
</p>

:)
