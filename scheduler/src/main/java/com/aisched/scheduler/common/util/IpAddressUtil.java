package com.aisched.scheduler.common.util;

import java.net.InetAddress;
import java.net.UnknownHostException;

public final class IpAddressUtil {

    private IpAddressUtil() {}

    public static String getLocalIp() {
        try {
            return InetAddress.getLocalHost().getHostAddress();
        } catch (UnknownHostException e) {
            return "127.0.0.1";
        }
    }

    public static boolean isReachable(String ip, int timeoutMs) {
        try {
            return InetAddress.getByName(ip).isReachable(timeoutMs);
        } catch (Exception e) {
            return false;
        }
    }
}
