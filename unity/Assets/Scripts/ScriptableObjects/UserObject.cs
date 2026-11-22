using UnityEngine;

[CreateAssetMenu(fileName = "UserObject", menuName = "Scriptable Objects/UserObject")]
public class UserObject : ScriptableObject
{
    public string id;
    public string username;
    public Sprite profilePicture;
}

