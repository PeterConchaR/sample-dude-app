(function (global) {

    var app = global.app = global.app || {};

    var everlive = {
       apiKey: 'y4amUffZpy1LsFYg',
       scheme: 'http'
  	};

    app.el = new Everlive(everlive.apiKey);

   	app.TAP_TO_SIGNUP = "Tap to Signup";
    app.TAP_TO_LOGIN = "Tap to Login";

    document.addEventListener('deviceready', function () {

      StatusBar.overlaysWebView(true);
      StatusBar.hide();
      if (typeof Keyboard !== 'undefined'){
        Keyboard.hideFormAccessoryBar(true);
      }

      app.initData = function(){
          app.dataSource = new kendo.data.DataSource({
              data :[]
          });
      };

      app.initData();

      app.spinner = new Spinner({color:"#fff", width:3, className:'spin'}).spin();


      app.application = new kendo.mobile.Application($(document.body), {statusBarStyle: "hidden"
      });

      function initializeDb(callback){
         if (window.cblite){
           window.cblite.getURL(function(err, url){
             if (!err){
                app.cbLiteUrl = url;
                $.get(app.cbLiteUrl + 'user').done(function(result){
                    callback();
                }).fail(function(err){
                    if (err.status === 404){
                      $.ajax({
                        url : app.cbLiteUrl + 'user',
                        type: 'PUT'
                      }).done(function(result){
                          if (result.ok){
                             callback();
                          }
                      }).fail(function(err){
                          alert(JSON.stringify(err));
                      });
                    }
                });
              }
           });
         }
        };

       initializeDb(function(){
          $.get(app.cbLiteUrl + 'user/_all_docs').done(function(result){
              if (result.rows.length > 0){
                  // do the user processing.
                  app.Data.currentUser(function(user){
                      if (user !== null){
                          app.username = user.username;
                          angular.bootstrap(document, []);
                          app.application.navigate("#main", 'slide');
                      }
                  });
              }
              else{
                  angular.bootstrap(document, []);
                  navigator.splashscreen.hide();
              }
          });
       });

      app.notificationCallback = function(notification){
        var initialized = false;

        for (var index = 0; index < app.dataSource.total(); index++){
            if (app.dataSource.at(index).name.toLowerCase() === notification.alert.toLowerCase()){
              initialized = true;
            }
        }

        if (!initialized && app.username.toUpperCase() !== notification.alert.trim()){
          app.dataSource.insert(0, {name: notification.alert.trim().toUpperCase()});
          app.Data.updateFriendsList();
        }
      }

      app.pushSettings = {
          iOS: {
              badge: "true",
              sound: "true",
              alert: "true"
          },
          android:{
              senderID:"895584377110"
          },
          notificationCallbackAndroid: function(e){
            app.notificationCallback({
              alert : e.message
            });
          },
          notificationCallbackIOS: function(e){
            app.notificationCallback(e);
          }
      };

      app.loader = function(el){
        var loader = $(el).next();

        if (loader.find('.spin').length == 0)
          loader.append(app.spinner.el);

          return loader;
      };

      $(document).on('click', 'a[href="/invite"]', function(e){
          navigator.contacts.pickContact(function(contact){
                window.setTimeout(function(){
                    if (contact.phoneNumbers.length){
                      var messageInfo = {
                        phoneNumber: contact.phoneNumbers[0].value,
                        textMessage: "I want to Dude you. Download the app to get started"
                      };

                      sms.sendMessage(messageInfo, function(message) {
                        console.log("success: " + message);
                      }, function(error) {
                        console.log("code: " + error.code + ", message: " + error.message);
                      });
                  }else{
                    alert("Invalid Recipent" + contact.name.formatted);
                  }
                }, 500);
            });
      });

      $(document).on('click', 'a[href="/dude"]', function(e){

        var username = $(e.target).text().trim();
	      var loader =  app.loader(e.target);

        if (!$(e.target).hasClass('hidden')){
           $(e.target).addClass('hidden');
        }

        loader.show();

        var notification = {
              "Filter":  "{ \"Parameters.Username\" : \"" + username.toUpperCase() + "\"}",
              "IOS": {
                "aps": {
                    "alert": app.username,
                    "sound": "default"
              }
            },
            "Android": {
                "data": {
                    "title": "Dude",
                    "message": app.username,
                    "delay_while_idle" : "0",
                    "collapse_key" : app.username
                }
            }
        };

        var url = "http://api.everlive.com/v1/" + everlive.apiKey + "/Push/Notifications";

        $.post(url, notification).done(function(result){
            loader.hide();

            $(e.target).text("Sent!");
            $(e.target).removeClass('hidden');

            window.setTimeout(function(){
                $(e.target).text(username);
            }, 1000);
        }, function(err){
        });

        return false;
      });

      $(document).on('click', 'a[href="/logoff"]', function(e){
          app.initData();
          app.PushRegistrar.disablePushNotifications();

          var docUrl = app.cbLiteUrl + 'user/' + app.username;

          $.get(docUrl).done(function(result){
            $.ajax({
                url : docUrl + '?rev=' + result._rev,
                type: 'DELETE',
            }).done(function(result){
                app.application.navigate("#home", "slide:right");
            }).fail(function(err){
                alert(JSON.stringify(err));
            });
          });

          return false;
      });

      $(document).on('keypress', 'input[id="newuser"]', function(e){
        if (e.which == 13){
              var loader =  app.loader(e.target);

              var username = $(e.target).val();
              var filter = new Everlive.Query();

              filter.where().eq('Username', username.toUpperCase());

              var data = app.el.data('Users');

              if (!$(e.target).hasClass('hidden')){
                 $(e.target).addClass('hidden');
              }

              $(e.target).blur();
              loader.show();

              data.get(filter)
                  .then(function(data){
                      $(e.target).removeClass('hidden');
                      if (data.count == 1){
                          app.dataSource.insert(0, {
                            name: username
                          });

                          $(e.target).val("");

                          app.Data.updateFriendsList();
                      }else{
                          $(e.target).val("Invalid User");
                          window.setTimeout(function(){
                              $(e.target).val("");
                          }, 1000);
                      }
                      loader.hide();
                  },
                  function(error){
                      $(e.target).removeClass('hidden');
                      $(e.target).val("Invalid User");
                      window.setTimeout(function(){
                          $(e.target).val("");
                      }, 1000);
                      loader.hide();
                  });
          }
      });

    }, false);

})(window);
