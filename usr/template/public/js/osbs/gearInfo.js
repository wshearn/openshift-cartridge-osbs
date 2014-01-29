var socket;

function scheduleRestore_ajaxCall(gear, date, uuid)
{
  var url="/restorebackup";
  var data = {
    gear: gear,
    date: date,
    uuid: uuid
  }

  socket.emit('restorebackup', data);
}
function scheduleBackup_ajaxCall(event)
{
  var url=$("#schedulebackup_form").attr("action");
  var data = {
    gear: $("#gearName").val(),
    occurrence: $("#occurrence").val()
  }

  var posting = $.post(url, data);

  posting.done(scheduleBackup_showSuccessBox);
  posting.fail(scheduleBackup_showFailureBox);
}

function scheduleRestore_showSuccessBox()
{
  $("#restore-success-box").slideDown();
}
function scheduleBackup_showSuccessBox()
{
  $("#schedule-success-box").slideDown();
}

function scheduleRestore_showFailureBox()
{
  $("#restore-failure-box").slideDown();
}
function scheduleBackup_showFailureBox()
{
  $("#schedule-failure-box").slideDown();
}


function page_loaded () {
  socket = io.connect("https://" + window.location.host);

  $("#schedule-success-box").click(function() {
      $( this ).slideUp();
  });
  $("#schedule-failure-box").click(function() {
      $( this ).slideUp();
  });
  $("#restore-success-box").click(function() {
      $( this ).slideUp();
  });
  $("#restore-failure-box").click(function() {
      $( this ).slideUp();
  });
  $("#schedule_submit").click(function(event) {
      scheduleBackup_ajaxCall(event);
  });
}
