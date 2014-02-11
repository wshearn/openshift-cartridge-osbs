var socket;

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    if (i == 0) return bytes + ' ' + sizes[i];
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

function restoreBackup(gear, date, uid)
{
  var data = {
    gear: gear,
    date: date,
    uid:  uid
  };

  socket.emit('restorebackup', data);
}

function takeBackup(gear)
{
  var data = {
    gear: gear
  };

  socket.emit('takebackup', data);
}

function deleteBackup(gear, uid)
{
  var data = {
    gear: gear,
    uid: uid
  };

  socket.emit('deletebackup', data);

  $("div#" + uid).slideUp();
}

function scheduleDaily(gear)
{
    var data = {
        gear: gear,
        enable: $("#daily1").is(":checked")
    };

    socket.emit('scheduledaily', data);
}

function scheduleWeekly(gear)
{
    var data = {
        gear: gear,
        enable: $("#weekly1").is(":checked")
    };

    socket.emit('scheduleweekly', data);
}

function scheduleMonthly(gear)
{
    var data = {
        gear: gear,
        enable: $("#monthly1").is(":checked")
    };

    socket.emit('schedulemonthly', data);
}

function updateScheduleBox(data) {
    if (data.status == "finished") {
        var newBackup  = "";
            newBackup += '<div class="row" id="' + data.backup.uid +'" style="display: none" >';
            newBackup += '  <div class="small-3 columns">';
            newBackup += '    <h4>Name</h4>';
            newBackup += '  </div>';
            newBackup += '  <div class="small-2 columns">';
            newBackup += '    <h4>'+ data.backup.date +'</h4>';
            newBackup += '  </div>';
            newBackup += '  <div class="small-2 columns">';
            newBackup += '    <h4>' + bytesToSize(data.backup.size) +'</h4>';
            newBackup += '  </div>';
            newBackup += '  <div class="small-2 columns">';
            newBackup += '    <h4><a href="/downloadbackup/' + data.gear + '/' + data.backup.date + '/' + data.backup.uid +'">Download</a></h4>';
            newBackup += '  </div>';
            newBackup += '  <div class="large-2 columns">';
            newBackup += '    <button onclick="restoreBackup(\'' + data.gear + '\', \'' + data.backup.date + '\', \'' + data.backup.uid +'\')" class="warn button">Restore</button>';
            newBackup += '  </div>';
            newBackup += '  <span class="gicon-remove left" title="Delete this backup" onclick="deleteBackup(\'' + data.gear + '\', \'' + data.backup.uid + '\')"></span>';
            newBackup += '</div>';

        var divBackups = $("div#backups");
        divBackups.html(newBackup + divBackups.html());
        $("#" + data.backup.uid).slideDown();
        $("#infoBox").slideUp();
    } else {
        $("#infoBox").text(data.message).slideDown();
    }
}

function updateRestoreBox (data) {
  $("#infoBox").text(data.message).slideDown();
}

function page_loaded () {
    socket = io.connect("http://" + window.location.hostname + ":8000");

    socket.on("scheduleupdate", updateScheduleBox);
    socket.on("restoreupdate", updateRestoreBox);

    $("#infoBox").click(function() {
        $( this ).slideUp();
    });

    $(".backupSize").each(function(){
        $(this).text(bytesToSize($(this).text()));
    });
}
