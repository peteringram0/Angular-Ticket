var app = angular.module('myapp', ['ngRoute', 'firebase', 'textAngular', 'ui.bootstrap', 'googlechart']);

'use strict';

app.constant('constants', {
	firebase : "https://angular-ticket.firebaseio.com/",
});

app.config(['$routeProvider', function($routeProvider){
	$routeProvider.
    	when('/createticket', {
	        controller: 'CreateTicketController',
        	templateUrl: "segments/createTicket.html",
	        private : false
    	}).
    	when('/tickets/:status/:group', {
	        controller: 'TicketsController',
        	templateUrl: "segments/tickets.html",
	        private : true
    	}).
      when('/liveboard', {
         // controller: 'TicketsController',
          templateUrl: "segments/liveBoard.html",
          private : true
      }).
      when('/ticket/:status/:id', {
          controller: 'TicketController',
          templateUrl: "segments/ticket.html",
          private : true
      }).
      when('/test', {
          controller: 'test',
          templateUrl: "segments/test.html",
          private : false
      }).
    	otherwise({
        	redirectTo: '/createticket'
      });
}]);

app.run(function ($rootScope, constants) {
  $rootScope.constants = constants; // Lets make these settings system wide
  $rootScope.alert = [];
});

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
      $rootScope.$broadcast('BroadcastAlertAdded');
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
      $rootScope.$broadcast('BroadcastAlertAdded');
		}
	} // /.return

}); // End FirebaseFactory


app.factory("TicketsFactory",function($rootScope,HelperFactory,$firebase){

  return{
    create: function(data){

      var obj = $firebase(new Firebase($rootScope.constants.firebase+'tickets/open')).$asArray();

      return obj.$add(data).then(
        function (ref) {
          var id = ref.name();
          HelperFactory.AlertsAdd({ type: 'success', msg: 'Ticket Created. <a href="#/ticket/open/'+id+'">Please save this link to check and update your ticket status</a>' });
          $rootScope.$broadcast('BroadcastAlertAddedInside');
         // return id;
        },
        function (err) {
          console.error('ERROR:', err);
          HelperFactory.AlertsAdd({ type: 'danger', msg: 'Something went wrong. Sorry your ticket could not be created.' });
          $rootScope.$broadcast('BroadcastAlertAddedInside');
          return null;
        }
      );

    },
    get: function(status){
      var ref = new Firebase($rootScope.constants.firebase+'tickets/'+status);
      return $firebase(ref).$asArray();
    },
    find: function(id,status){
      var ref = new Firebase($rootScope.constants.firebase+'tickets/'+status+'/'+id);
      return $firebase(ref).$asObject();
    },
    addTicketUpdate: function(id,data){

      var obj = $firebase(new Firebase($rootScope.constants.firebase+'tickets/open/'+id+'/comments')).$asArray();

      obj.$add(data).then(function(ref) {
        ref.name();
      });

    },
    changeTicketStatus: function(id,status,currentStatus){

      var oldTicketLocation = new Firebase($rootScope.constants.firebase+'tickets/'+currentStatus+'/'+id);
      var newTicketPath = new Firebase($rootScope.constants.firebase+'tickets/'+status);

      var oldTicket = []; // blank array for when we close tickets  :)

      /* I have to do it this way with angularfire 8.0 :( */
      oldTicketLocation.on('value', function(snapshot) {
        oldTicket.push(snapshot.val()); // Lets get the data without any hidden vars
      });

      $firebase(newTicketPath).$set(id, oldTicket[0]);
      $firebase(oldTicketLocation).$remove();

      oldTicket = [];

      HelperFactory.AlertsAdd({ type: 'info', msg: 'Ticket status changed to '+status });
      $rootScope.$broadcast('BroadcastAlertAddedInside');

    },
    changeTicketGroup: function(id, newGroup){

      var ref = new Firebase($rootScope.constants.firebase+'tickets/open/'+id);
      $firebase(ref).$update({group: newGroup});

    },
    countOpenTicketsPerGroup: function(){

      var countTickets = [];
        countTickets.group = {};

      var obj = new Firebase($rootScope.constants.firebase+'tickets/open');
  
      obj.on('value', function(snapshot) {
        var tickets = snapshot.val();

        if(Object.getOwnPropertyNames(countTickets.group).length != 0){
          countTickets.group = {};
        }

        for (ticket in tickets) {
          group = countTickets.group[tickets[ticket]['group']];
          if(!group){
            countTickets.group[tickets[ticket]['group']] = 1;
          } else{
            countTickets.group[tickets[ticket]['group']] ++;
          }
        }
      });

      return countTickets;

    } // End function, countOpenTickets
  }

}); // End TicketsFactory


app.controller("TicketController",function($rootScope,$scope,HelperFactory,TicketsFactory,$routeParams,ConfigFactory,$location){
  
  $scope.status = $routeParams.status;
  $scope.ticket = TicketsFactory.find($routeParams.id,$scope.status);
  $scope.ticketID = $routeParams.id;

  $scope.addCommentToTicket = function(){

    if(!HelperFactory.GetUserInfo().email){
      commenter = 'user';
      name = '';
    } else {
      commenter = 'agent';
      name = HelperFactory.GetUserInfo().email;
    }

    var data = {
      time: Firebase.ServerValue.TIMESTAMP,
      commenterGroup: commenter,
      commenterName: name,
      comment: $scope.ticketUpdateText
    }

    TicketsFactory.addTicketUpdate($routeParams.id,data);

    $scope.ticketUpdateText = '';

  };

  $scope.changeTicketStatus = function(id, status){
    TicketsFactory.changeTicketStatus(id, status, $scope.status);
    $location.path('/tickets/open/all');
  };

  $scope.changeTicketGroup = function(newGroup){
    alert(newGroup);
  }

  $scope.changeTicketGroup = function(id,newGroup){
    TicketsFactory.changeTicketGroup(id, newGroup);
  }

});

app.controller("TicketsController",function($rootScope,$scope,HelperFactory,TicketsFactory,$location,$routeParams){

  $scope.status = $routeParams.status
  $scope.tickets = TicketsFactory.get($scope.status);

  if($routeParams.group == 'all'){
    $scope.showGroup = '';
  } else {
    $scope.showGroup = $routeParams.group;
  }

  $scope.goToTicket = function(id){
    $location.path("/ticket/"+$routeParams.status+'/'+id);
  }

  $scope.ticketSelectionShow = function(selection){
    $location.path("/tickets/"+selection+'/all');
  }

});

app.controller("CreateTicketController",function($rootScope,$scope,TicketsFactory,ConfigFactory){
  
  $scope.ticketGroups = ConfigFactory.getConfig('groups');

  $scope.createTicket = function(){
    var currDate = new Date();
    TicketsFactory.create({
      date: Firebase.ServerValue.TIMESTAMP,
      group: $scope.group,
      name: $scope.name,
      email: $scope.email,
      subject : $scope.subject,
      number: $scope.number,
      details:$scope.htmlVariable
    });
  };

});

app.controller("MyRootController",function($rootScope,$scope,HelperFactory,FirebaseFactory,$location,ConfigFactory,TicketsFactory){

  $scope.$on('BroadcastAlertAdded', function() {
    $rootScope.$apply(function() { /* Whenever you touch anything from outside of the Angular world, you need to call $apply, to notify Angular */
      $scope.alerts = HelperFactory.AlertsGet();
    });
	});

  $scope.$on('BroadcastAlertAddedInside', function() { // no apply needed for inside calls
    $scope.alerts = HelperFactory.AlertsGet();
  });

  $scope.$on('BroadcastUserInfoChanged', function() {
    $scope.userInfo = [];
    $rootScope.$apply(function() {
      $scope.userInfo.email = HelperFactory.GetUserInfo().email;
    });
    $scope.groupcounts = TicketsFactory.countOpenTicketsPerGroup(); // list count per groups
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

  $scope.config = ConfigFactory.getConfig('');

});

app.factory("HelperFactory",function($rootScope){

	var factory = {}
		factory.alerts = [];
    factory.user = [];

	return{
		AlertsAdd: function(data){
			factory.alerts.push({ type: data.type, msg: data.msg });
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

  $scope.closeAlert = function(index) {
  	HelperFactory.AlertsClose(index);
  };

} // End function


app.factory("ConfigFactory",function($rootScope,$firebase){

  return{
    getConfig: function(range){
      var ref = new Firebase($rootScope.constants.firebase+'config/'+range);
      return $firebase(ref).$asObject();
    }
  }
  
}); // End FirebaseFactory

app.controller('GoogleChartDataController',function($scope,$rootScope,HelperFactory,$firebase){

  var countTickets = [];

  var ref = new Firebase($rootScope.constants.firebase+'tickets/open');
  
  $scope.chartScope = function(){
    $scope.chartObject = {};
    $scope.chartObject.data = {"cols": [
        {id: "t", label: "Status", type: "string"},
        {id: "s", label: "Tickets", type: "number"}
      ],
      "rows": $scope.countTickets
    };
    $scope.chartObject.type = 'PieChart'; // BarChart, PieChart, ColumnChart ...
    $scope.chartObject.options = {
        'pieHole': 0.4,
        'pieSliceText': 'value'
    }
  }

  ref.on('value', function(snapshot) {
    
    var tickets = snapshot.val()
    
    var countTickets = []; // clear it so when firebase runs this function again the data is re-arranged
      countTickets.group = {};

    var graphArray = [];

    for (ticket in tickets) { // for each ticket sort out into an array based on the groups
      group = countTickets.group[tickets[ticket]['group']];
        if(!group){
          countTickets.group[tickets[ticket]['group']] = 1;
        } else{
          countTickets.group[tickets[ticket]['group']] ++;
      }
    };

    for(group in countTickets.group){ // for each of the groups put into a format that google graphs likes to read
      graphArray.push({c: [{v: group},{v: countTickets.group[group]}]});
    }

    $scope.countTickets = graphArray
    $rootScope.$broadcast('BroadcastUpdateCharts'); // there is an update
    $scope.chartScope(); // lets run the apply to update the scope eliment

  });

  $scope.$on('BroadcastUpdateCharts', function() {
    $rootScope.$apply(function() {
      $scope.chartScope();
    });
  });


});