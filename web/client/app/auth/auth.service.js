'use strict';

angular.module('j9dl')
  .factory('auth', function ($http) {
  
    var user;

    // Public API here
    return {
      
      register: function (formData, success, error) {
        $http.post('api/users', formData)
        .success(function(res) {
            user = res;
            // TO DO - mark them as logged in on the client
            success();
        })
        .error(error);
      },

      login: function (formData, success, error) {
        $http.post('api/login', formData)
        .success(function(res) {
            
            user = res;
            // TO DO - mark them as logged in on the client
            success();
        })
        .error(error);
      },

      logout: function(done) {
        $http.get('api/logout')
        .success(function() {
          done();
        })
        .error(function() {
          done();
        });
      },

      getCurrentLogin: function(success, error) {

        if(user) {
          success(user);
        } else {
          // maybe we're out of sync w/ server
          $http.get('api/session')
          .success(function(res) {
            user = res;
            success(user);
          })
          .error(error);
        }
      }
    };
  });
