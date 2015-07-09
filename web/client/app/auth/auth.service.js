'use strict';

angular.module('j9dl')
  .factory('auth', function ($http, $rootScope, $cookieStore) {
  
    var user;

    // Public API here
    return {
      
      register: function (formData, success, error) {
        $http.post('http://localhost:8000/users', formData)
        .success(function(res) {
            // TO DO - mark them as logged in on the client
            success();
        })
        .error(error);
      },

      login: function (formData, success, error) {
        $http.post('http://localhost:8000/login', formData)
        .success(function(res) {
            // TO DO - mark them as logged in on the client
            success();
        })
        .error(error);
      }
      
    };
  });
