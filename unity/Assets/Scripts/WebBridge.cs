using UnityEngine;
using System.Runtime.InteropServices;

public class WebBridge : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void OpenProfile(string userId);
    [DllImport("__Internal")]
    private static extern void NotifyRSVPReady();

    public static void SignalRSVPReady()
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        NotifyRSVPReady();
#endif
    }

    public static void ShowProfile(string userId)
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        OpenProfile(userId);
#endif
    }
}
