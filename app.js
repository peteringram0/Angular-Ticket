var app = angular.module('myapp', ['ngRoute', 'firebase', 'textAngular', 'ui.bootstrap', 'googlechart']);

'use strict';

app.constant('constants', {
	firebase : "https://angular-ticket.firebaseio.com/",
});

app.config(['$routeProvider', function($routeProvider){
	$routeProvider.
    	when('/home', {
	      //  controller: 'CreateTicketController',
        	templateUrl: "segments/home.html",
	        private : false
    	}).
    	when('/createticket', {
	        controller: 'CreateTicketController',
        	templateUrl: "segments/createTicket.html",
	        private : false
    	}).
    	when('/tickets', {
	        controller: 'TicketsController',
        	templateUrl: "segments/tickets.html",
	        private : true
    	}).
    	otherwise({
        	redirectTo: '/home'
      	});
}]);

app.run(function ($rootScope, constants) {
  $rootScope.constants = constants; // Lets make these settings system wide
  $rootScope.alert = [];
});

/* define what happpens when the route changes */
app.run(function($location,$route,$rootScope,HelperFactory) {
  $rootScope.$on('$routeChangeStart', function(event, next, current) {
    var nextPath = $location.path();
    var nextRoute = $route.routes[nextPath];
    if(nextRoute == undefined || nextRoute['private'] == false){ return };
    if(nextRoute['private'] == true){
      if(!HelperFactory.GetUserInfo().email) {
        $location.path('/');
      }
    }
  });
});

app.directive('login', function() {
		return {
  		templateUrl: 'segments/login.html'
  	};
});
app.directive('navagationbar', function() {
		return {
  		templateUrl: 'segments/navagationBar.html'
  	};
});


app.factory("FirebaseFactory",function($rootScope,HelperFactory){

	var firebaseConnection = new Firebase($rootScope.constants.firebase);

	var auth = new FirebaseSimpleLogin(firebaseConnection, function(error, user) {
		if (error) {
			HelperFactory.AlertsAdd({ type: 'danger', msg: error['code'] });
			return;
		} else if (user) {
      HelperFactory.SetUserInfo(user);
		} else {
			// user is logged out
		}    
	}); // /.var auth
	
	return{
		auth: function(details){

			auth.login('password', {
			  email: details.email,
			  password: details.pass
			});

      //$('#modal').modal({show: false});

		}, // /.auth
		logout: function(){
      HelperFactory.SetUserInfo("");
			auth.logout();
			HelperFactory.AlertsAdd({ type: 'success', msg: 'Logged Out.' });
		}
	} // /.return

}); // End FirebaseFactory




app.factory("TicketsFactory",function($rootScope,HelperFactory,$firebase){

  var ref = new Firebase($rootScope.constants.firebase+'tickets/open');
  var firebaseConnection = $firebase(ref);

  return{
    create: function(data){

      return firebaseConnection.$add(data).then(
        function (ref) {
          var id = ref.name();
          console.log('SUCCESS: added ticket with id:', id);
          HelperFactory.AlertsAdd({ type: 'success', msg: 'Ticket Created.' });
          return id;
        },
        function (err) {
          console.error('ERROR:', err);
          HelperFactory.AlertsAdd({ type: 'danger', msg: 'Something went wrong. Sorry your ticket could not be created.' });
          return null;
        }
      );

    },
  }

}); // End TicketsFactory


app.controller("TicketsController",function($rootScope,$scope,HelperFactory,TicketsFactory){
  
  var ref = new Firebase($rootScope.constants.firebase+'tickets/open');
  ref.on('value', function(snapshot) {
    $scope.tickets = snapshot.val();
  }, function(err) {
    HelperFactory.AlertsAdd({ type: 'danger', msg: "You don't have permissions for this." });
  });

});

app.controller("CreateTicketController",function($rootScope,$scope,TicketsFactory){
  $scope.createTicket = function(){
    var currDate = new Date();
    TicketsFactory.create({date: Firebase.ServerValue.TIMESTAMP, name: $scope.name, details: $scope.htmlVariable});
  };
})

app.controller("MyRootController",function($rootScope,$scope,HelperFactory,FirebaseFactory,$location){

  $scope.$on('BroadcastAlertAdded', function() {
		$scope.alerts = HelperFactory.AlertsGet();
	});

  $scope.$on('BroadcastUserInfoChanged', function() {
    $scope.userInfo = [];
    $scope.userInfo.email = HelperFactory.GetUserInfo().email;
  });

	$scope.login = function(){
		if($scope.loginForm.$valid){
			FirebaseFactory.auth({email: $scope.email, pass: $scope.password});
		}
	};

	$scope.logout = function(){
		FirebaseFactory.logout();
	};

	$scope.getURL = function(path) {
	    if ($location.path().substr(0, path.length) == path) {
	      return "active"
	    } else {
	      return ""
	    }
	};

});

app.factory("HelperFactory",function($rootScope){

	var factory = {}
		factory.alerts = [];
    factory.user = [];

	return{
		AlertsAdd: function(data){
			factory.alerts.push({ type: data.type, msg: data.msg });
			$rootScope.$broadcast('BroadcastAlertAdded');
		},
		AlertsGet: function(){
			return factory.alerts;
		},
		AlertsClose: function(number){
			factory.alerts.splice(number, 1);
		},
    SetUserInfo: function(data){
      factory.user = data;
      $rootScope.$broadcast('BroadcastUserInfoChanged');
    },
    GetUserInfo: function(){
      return factory.user;
    },
    ConvertTimeStringToReadable: function(timeStamp){

      var date = new Date(timeStamp);
      dateOne = date.toLocaleString();

      datesplit = dateOne.split(" ");
      datestring = datesplit[0];
      datestringsplit = datestring.split("/");
      dateReArrange = datestringsplit[1]+"/"+datestringsplit[0]+"/"+datestringsplit[2];

      return dateReArrange;

    }
	}
	
}); // End FirebaseFactory

function AlertsFunction($scope,HelperFactory) {

  $scope.addAlert = function() {
    HelperFactory.AlertsAdd({ type: 'danger', msg: 'Oh snap! 2' });
   // $scope.alerts = HelperFactory.AlertsGet();
  };

  $scope.closeAlert = function(index) {
  	HelperFactory.AlertsClose(index);
  };

} // End function




app.controller('GoogleChartDataController',function($scope,$rootScope,HelperFactory){

  var tickets = [];

  var ref = new Firebase($rootScope.constants.firebase+'tickets/open');
  ref.on('value', function(snapshot) {
    
    var Opentickets = snapshot.val();

    for (var key in Opentickets) {
     var obj = Opentickets[key];
     for (var prop in obj) {
        
        date = HelperFactory.ConvertTimeStringToReadable(obj['date']);
        tickets.push({c:[{v: date},{v: 1},]});

     }
    };

  }, function(err) {
    HelperFactory.AlertsAdd({ type: 'danger', msg: "You don't have permissions for this." });
  });

  //console.log(tickets);
  
  $scope.chartObject = {};

  $scope.chartObject.data = {"cols": [
      {id: "t", label: "Day", type: "string"},
      {id: "s", label: "Tickets", type: "number"}
    ],
    "rows": tickets
  };

  $scope.chartObject.type = 'LineChart'; // BarChart, PieChart, ColumnChart ...
  $scope.chartObject.options = {curveType: 'function',}

});