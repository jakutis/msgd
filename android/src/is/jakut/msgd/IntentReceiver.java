package is.jakut.msgd;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.gsm.SmsManager;

public class IntentReceiver extends BroadcastReceiver {

	@Override
	public void onReceive(Context context, Intent intent) {
		SmsManager.getDefault().sendTextMessage(intent.getStringExtra("number"), null, intent.getStringExtra("message"), null, null);
	}

}
