function scheduleBackup_ajaxCall(event)
{
  var url=$("#schedulebackup_form").attr("action");
  var data = { 
    gear: $("#gearlist").val(),
    occurrence: $("#occurrence").val()
  }
  
  var posting = $.post(url, data);

  posting.done(scheduleBackup_showSuccessBox);
  posting.fail(scheduleBackup_showFailureBox);
}

function scheduleBackup_showSuccessBox()
{
  $("#success-box").slideDown();
}

function scheduleBackup_showFailureBox()
{
  $("#failure-box").slideDown();
}

function page_loaded () {
  $("#success-box").click(function() {
      $( this ).slideUp();
  });
  $("#failure-box").click(function() {
      $( this ).slideUp();
  });
  $("#schedule_submit").click(function(event) {
      scheduleBackup_ajaxCall(event);
  });
}
