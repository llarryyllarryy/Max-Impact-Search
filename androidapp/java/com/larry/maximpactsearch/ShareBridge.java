package com.larry.maximpactsearch;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

public class ShareBridge {
    private static final String FOLDER = "MaxImpactSearch";
    private final Activity activity;

    public ShareBridge(Activity activity) {
        this.activity = activity;
    }

    /** Called from the page: saves the PNG into the gallery (Pictures/MaxImpactSearch). */
    @JavascriptInterface
    public void saveImage(String base64, String name) {
        try {
            if (!hasLegacyPermission()) return;
            savePng(Base64.decode(base64, Base64.DEFAULT));
            toast("Saved to Pictures/" + FOLDER);
        } catch (Exception e) {
            toast("Could not save the image");
        }
    }

    /** Called from the page: saves the PNG, then opens Android's share sheet. */
    @JavascriptInterface
    public void shareImage(String base64, final String text) {
        try {
            if (!hasLegacyPermission()) return;
            final Uri uri = savePng(Base64.decode(base64, Base64.DEFAULT));
            activity.runOnUiThread(new Runnable() {
                @Override public void run() {
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType("image/png");
                    send.putExtra(Intent.EXTRA_STREAM, uri);
                    send.putExtra(Intent.EXTRA_TEXT, text);
                    send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    activity.startActivity(Intent.createChooser(send, "Share your impact"));
                }
            });
        } catch (Exception e) {
            toast("Could not share the image");
        }
    }

    // Android 9 and older need the storage permission; Android 10+ does not.
    private boolean hasLegacyPermission() {
        if (Build.VERSION.SDK_INT >= 29) return true;
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                == PackageManager.PERMISSION_GRANTED) return true;
        ActivityCompat.requestPermissions(activity,
                new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 1002);
        toast("Allow storage access, then tap again");
        return false;
    }

    private Uri savePng(byte[] data) throws IOException {
        String fileName = "maximpactsearch-impact-" + System.currentTimeMillis() + ".png";
        ContentResolver resolver = activity.getContentResolver();

        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
            v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + FOLDER);
            v.put(MediaStore.Images.Media.IS_PENDING, 1);
            Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new IOException("MediaStore insert failed");
            OutputStream out = resolver.openOutputStream(uri);
            try {
                if (out == null) throw new IOException("No output stream");
                out.write(data);
            } finally {
                if (out != null) out.close();
            }
            v.clear();
            v.put(MediaStore.Images.Media.IS_PENDING, 0);
            resolver.update(uri, v, null, null);
            return uri;
        }

        // Android 9 and older: write the file, then register it with the gallery
        File dir = new File(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_PICTURES), FOLDER);
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("Cannot create folder");
        File file = new File(dir, fileName);
        FileOutputStream out = new FileOutputStream(file);
        try {
            out.write(data);
        } finally {
            out.close();
        }
        ContentValues v = new ContentValues();
        v.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
        v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
        v.put(MediaStore.Images.Media.DATA, file.getAbsolutePath());
        Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
        if (uri == null) throw new IOException("MediaStore insert failed");
        return uri;
    }

    private void toast(final String message) {
        activity.runOnUiThread(new Runnable() {
            @Override public void run() {
                Toast.makeText(activity, message, Toast.LENGTH_SHORT).show();
            }
        });
    }
}
