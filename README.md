OpenShift Backup Service
========================
------------------------

OpenShift Backup Service(OSBS) is a simple cartridge that helps you manage backups for your applications

  - Schedule Backups
  - Download/Restore Backups
  - Automatically backup when a gear is stopped so you always have the latest data

Version:
--------------
0.1

Installation:
--------------
```sh
rhc app create osbs http://tinyurl.com/OpenShiftBackupService cron
```
Make note of the password that is printed out.

That's it for the server cartridge. Now you need to add the client to your applications you want to back up:
```sh
rhc cartridge add -a <application to backup> -c http://tinyurl.com/OpenShiftBackupClient
```

Usage:
--------------
Go to osbs-&lt;namespace&gt;.rhcloud.com and login with admin and the password that was printed when you created the application.

**To Schedule a backup:**
* Click `Schedule Backup` on the left hand menu
* From the first dropdown list select the gear you want to back up
* In the 2nd dropdown list select how offten you want to backup the gear
  - If you schedule a gear for Once it will schedule a backup to run in the next minute(this only run once)

**To download/restore a backup:**
* Click `Gear List` on the left hand menu
* Then Click `Manage` next to the application

Notes:
--------------
* The OSBS gear has to stay running
    * Since we use cron for the scheduling of backups, if the gear goes idle or stopped the cron jobs will no longer be ran
    * If you are a silver user or running this in an enterprise environment this should not affect you.

License:
--------------
ASL2.0
