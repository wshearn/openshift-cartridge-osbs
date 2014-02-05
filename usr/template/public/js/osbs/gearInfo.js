var socket;

function restoreBackup(gear, date, uid)
{
  var data = {
    gear: gear,
    date: date,
    uid:  uid
  }

  socket.emit('restorebackup', data);
}
function takeBackup(gear)
{
  var data = {
    gear: gear
  }

  socket.emit('takebackup', data)
}

function scheduleRestore_showSuccessBox()
{
  $("#restore-success-box").slideDown();
}
function scheduleRestore_showFailureBox()
{
  $("#restore-failure-box").slideDown();
}

function updateScheduleBox(data) {
  if (data.status == "finished") {
    var newBackup = "";
        newBackup += '<div class="row", id="newbackup-' + data.backup.uid +'", style="display: none" >';
        newBackup += '  <div class="large-4 columns">';
        newBackup += '    <h4>'+ data.backup.date +'</h4>';
        newBackup += '  </div>';
        newBackup += '  <div class="large-2 columns">';
        newBackup += '    <h4>' + data.backup.size +'</h4>';
        newBackup += '  </div>';
        newBackup += '  <div class="large-4 columns">';
        newBackup += '    <h4><a href="/downloadbackup/' + data.gear + '/' + data.backup.date + '/' + data.backup.uid +'">Download</a></h4>';
        newBackup += '  </div>';
        newBackup += '  <div class="large-2 columns">';
        newBackup += '    <button onclick="restoreBackup(\'' + data.gear + '\', \'' + data.backup.date + '\', \'' + data.backup.uid +'\')" class="warn button">Restore</button>';
        newBackup += '  </div>';
        newBackup += '</div>';

    $("div#backups").html(newBackup + $("div#backups").html())
    $("#newbackup-" + data.backup.uid).slideDown();
    $("#scheduleBox").slideUp();
  } else {
    $("#scheduleBox").text(data.message);
    $("#scheduleBox").slideDown();
  }
}

function updateRestoreBox (data) {
  $("#restoreBox").text(data.message);
  $("#restoreBox").slideDown();
}

function page_loaded () {
  socket = io.connect("http://" + window.location.hostname + ":8000");

  socket.on("scheduleupdate", updateScheduleBox);
  socket.on("restoreupdate", updateRestoreBox);

  $("#scheduleBox").click(function() {
      $( this ).slideUp();
  });
}
