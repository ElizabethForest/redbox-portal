/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs before your Sails app gets lifted.
 * This gives you an opportunity to set up your data model, run jobs, or perform some special logic.
 *
 * For more information on bootstrapping your app, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.bootstrap.html
 */
var Observable = require('rxjs/Observable').Observable;
const schedule = require('node-schedule');

module.exports.bootstrap = function(cb) {
    if (sails.config.security.csrf === "false") {
      sails.config.security.csrf = false;
    }
    // sails.config.peopleSearch.orcid = sails.services.orcidservice.searchOrcid;
    sails.config.startupMinute = Math.floor(Date.now() / 60000);
    sails.services.cacheservice.bootstrap();
    sails.log.verbose("Cache service, bootstrapped.");
    sails.services.translationservice.bootstrap();
    sails.log.verbose("Translation service, bootstrapped.");
    if (sails.config.environment == "production" || sails.config.ng2.force_bundle) {
      sails.config.ng2.use_bundled = true;
      console.log("Using NG2 Bundled files.......");
    }
    // actual bootstrap...
    sails.log.debug("Starting boostrap process with boostrapAlways set to: " +sails.config.appmode.bootstrapAlways);
    sails.services.brandingservice.bootstrap()
    .flatMap(defaultBrand => {
      sails.log.verbose("Branding service, bootstrapped.");
      return sails.services.rolesservice.bootstrap(defaultBrand);
    })
    .flatMap(defaultBrand => {
      sails.log.verbose("Roles service, bootstrapped.");
      // sails doesn't support 'populating' of nested associations
      // intentionally queried again because of nested 'users' population, couldn't be bothered with looping thru the results
      return sails.services.reportsservice.bootstrap(sails.services.brandingservice.getDefault());
    })
    .flatMap(defaultBrand => {
      sails.log.verbose("Reports service, bootstrapped.");
      // sails doesn't support 'populating' of nested associations
      // intentionally queried again because of nested 'users' population, couldn't be bothered with looping thru the results
      return sails.services.rolesservice.getRolesWithBrand(sails.services.brandingservice.getDefault());
    })
    .flatMap(defRoles => {
      sails.log.verbose("Roles service, bootstrapped.");
      return sails.services.usersservice.bootstrap(defRoles);
    })
    .flatMap(defUserAndDefRoles => {
      sails.log.verbose("Pathrules service, bootstrapped.");
      return sails.services.pathrulesservice.bootstrap(defUserAndDefRoles.defUser, defUserAndDefRoles.defRoles);
    })
    .flatMap(whatever => {
      sails.log.verbose("Record types service, bootstrapped.");
      return sails.services.recordtypesservice.bootstrap(sails.services.brandingservice.getDefault());
    }).flatMap(recordTypes => {
      sails.log.verbose("Workflowsteps service, bootstrapped.");
      return sails.services.workflowstepsservice.bootstrap(recordTypes);
    })
    .flatMap(workflowSteps => {
      sails.log.verbose("Workflowsteps service, bootstrapped.");
      if (_.isArray(workflowSteps)) {
        const obs = [];
        _.each(workflowSteps, workflowStep => {
          obs.push(sails.services.formsservice.bootstrap(workflowStep));
        });
        return Observable.zip(...obs);
      } else {
        return sails.services.formsservice.bootstrap(workflowSteps);
      }
    })
    .flatMap(whatever => {
      sails.log.verbose("Forms service, bootstrapped.");
      return sails.services.vocabservice.bootstrap();
    })
    .flatMap(x => {
      sails.log.verbose("Vocab service, bootstrapped.");
      // Schedule cronjobs
      if(sails.config.crontab.enabled) {
        sails.config.crontab.crons().forEach(item => {
          schedule.scheduleJob(item.interval, () => {
            //At the moment no arguments are needed.
            sails.services[item.service][item.method]();
          });
        });
        sails.log.debug('cronjobs scheduled...');
      }
      return Observable.of('');
    })
    .last()
    .flatMap(whatever => {
      sails.log.verbose("Cron service, bootstrapped.");
      // After last, because it was being triggered twice
      return sails.services.workspacetypesservice.bootstrap(sails.services.brandingservice.getDefault());
    })
    .subscribe(retval => {
      sails.log.verbose("WorkspaceTypes service, bootstrapped.");
     sails.log.ship = function() {
     sails.log.info(".----------------. .----------------. .----------------. ");
     sails.log.info("| .--------------. | .--------------. | .--------------. |");
     sails.log.info("| |  _______     | | |  _________   | | |  ________    | |");
     sails.log.info("| | |_   __ \\    | | | |_   ___  |  | | | |_   ___ `.  | |");
     sails.log.info("| |   | |__) |   | | |   | |_  \\_|  | | |   | |   `. \\ | |");
     sails.log.info("| |   |  __ /    | | |   |  _|  _   | | |   | |    | | | |");
     sails.log.info("| |  _| |  \\ \\_  | | |  _| |___/ |  | | |  _| |___.' / | |");
     sails.log.info("| | |____| |___| | | | |_________|  | | | |________.'  | |");
     sails.log.info("| |              | | |              | | |              | |");
     sails.log.info("| '--------------' | '--------------' | '--------------' |");
     sails.log.info("'----------------' '----------------' '----------------' ");
    sails.log.info(".----------------. .----------------. .----------------. ");
     sails.log.info("| .--------------. | .--------------. | .--------------. |");
     sails.log.info("| |   ______     | | |     ____     | | |  ____  ____  | |");
     sails.log.info("| |  |_   _ \\    | | |   .'    `.   | | | |_  _||_  _| | |");
     sails.log.info("| |    | |_) |   | | |  /  .--.  \\  | | |   \\ \\  / /   | |");
     sails.log.info("| |    |  __'.   | | |  | |    | |  | | |    > `' <    | |");
     sails.log.info("| |   _| |__) |  | | |  \\  `--'  /  | | |  _/ /'`\\ \\_  | |");
     sails.log.info("| |  |_______/   | | |   `.____.'   | | | |____||____| | |");
     sails.log.info("| |              | | |              | | |              | |");
     sails.log.info("| '--------------' | '--------------' | '--------------' |");
     sails.log.info("'----------------' '----------------' '----------------' ");
     }

      sails.log.verbose("Waiting for ReDBox Storage to start...");

      sails.services.recordsservice.checkRedboxRunning().then(response => {
        if(response == true) {
          sails.log.verbose("Bootstrap complete!");
        // It's very important to trigger this callback method when you are finished
        // with the bootstrap!  (otherwise your server will never lift, since it's waiting on the bootstrap)
          cb();
        } else {
          throw new Error('ReDBox Storage failed to start');
        }
      });


    },
    error => {
      sails.log.verbose("Bootstrap failed!!!");
      sails.log.error(error);
    });

};
